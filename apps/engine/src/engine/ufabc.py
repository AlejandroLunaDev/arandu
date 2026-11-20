"""UFABC: the graduação course list (campus per course), each course page (its name) and the yearly discipline
catalog by course (XLSX)."""

import html as entities
import re
import unicodedata
import zipfile
from collections import Counter, defaultdict
from types import SimpleNamespace
from xml.etree import ElementTree

from engine import curricula

BASE = "https://prograd.ufabc.edu.br"
INEP_CODE = 4925  # Universidade Federal do ABC's CO_IES in the INEP census

# In each course table cell: a 'Campus <city>' or 'Campi <a> e <b>' line, or a course link.
TOKEN = re.compile(r'<em>(Camp(?:us|i))[^<]*</em>(.*?)</p>|<a[^>]+href="(/[a-z/-]+)"[^>]*>(.*?)</a>', re.S)
# The course page's own heading, e.g. 'Engenharia de Energia' where the list says only 'Energia'.
HEADING = re.compile(r'<h1 class="documentFirstHeading">(.*?)</h1>', re.S)
# The list publishes each course's campus; its source label carries the city to the course page level.
LABEL = re.compile(r"UFABC, campus (.+?): ")
# A course code in the catalog's 'Curso (categoria)' cell: 'BCC - ...', 'BNEU Bacharelado', even 'BCBBacharelado'.
SIGLA = re.compile(r"\b([A-Z][A-Z&]{1,5})(?=\s*-|\s+[A-Z][a-z]|[A-Z][a-z])")
CATEGORY = {frozenset({"OBR"}): False, frozenset({"OL"}): True}  # obrigatória, opção limitada; anything else unknown
# Catalog codes whose course page slug differs; every other code is its slug ('BC&T' -> /bct).
SLUGS = {
    "BBT": "bb", "BMAT": "bm", "BNEU": "bn", "EAER": "ea", "EBIO": "eb", "EENE": "ee", "ENE": "ee", "EGES": "eg",
    "EEGES": "eg", "EINF": "ei", "EMAT": "em", "EUA": "eau", "LGE": "lg", "LMAT": "lm", "LPE": "lp", "LEC": "lec-chs",
}
HEADER = {"A": "SIGLA", "B": "DISCIPLINA", "C": "TPEI", "D": "Curso (categoria)"}
NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"


def _text(html):
    return " ".join(entities.unescape(re.sub(r"<[^>]+>", " ", html)).split())


def _key(text):
    return re.sub(r"[^a-z]", "", unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().lower())


def parse_courses(doc):
    """Return (course page url, list label, city) for every course the list places on one campus."""
    html = doc.read().decode("utf-8")
    courses = {}
    for table in re.findall(r'<table class="category table.*?</table>', html, re.S):
        for cell in re.findall(r"<td[^>]*>(.*?)</td>", table, re.S):
            # A link takes the campus line above it in its cell, or the one below for the BC&T-style entry courses.
            city, campus_seen, waiting = None, False, []
            for campus, place, path, label in TOKEN.findall(cell):
                if campus:
                    city = _text(place) if campus == "Campus" else None  # 'Campi A e B': no single city
                    campus_seen = True
                    for url, name in waiting:
                        courses.setdefault(url, (name, city))
                    waiting = []
                elif campus_seen:
                    courses.setdefault(BASE + path, (_text(label), city))
                else:
                    waiting.append((BASE + path, _text(label)))
    # Left out: courses with no campus line (Educação do Campo) or two campi (BC&T), as their city is unknown.
    found = [(url, name, city) for url, (name, city) in courses.items() if city]
    if not found:
        raise ValueError("no course with a campus found on the course list")
    return found


def load_courses(conn, source_id, parsed):
    """Register each course page as a source of ufabc_course_page, its label naming the campus city."""
    # A campus change rewrites the label; the course page level later writes its own name after the colon.
    return sum(
        conn.execute(
            """insert into sources (adapter, url, label) values ('ufabc_course_page', %s, %s)
               on conflict (url) do update set label = excluded.label
                 where split_part(sources.label, ':', 1) is distinct from split_part(excluded.label, ':', 1)""",
            (url, f"UFABC, campus {city}: {name}"),
        ).rowcount
        for url, name, city in parsed
    )


def parse_course_page(doc):
    """Return the course name the page's heading publishes, e.g. 'Bacharelado em Ciência da Computação'."""
    heading = HEADING.search(doc.read().decode("utf-8"))
    if not heading or not _text(heading[1]):
        raise ValueError("no course heading found on the course page")
    return _text(heading[1])


def load_course_page(conn, source_id, name):
    """Stage the page's course in the city its list label names, replacing a city the list no longer gives."""
    url, label = conn.execute("select url, label from sources where id = %s", (source_id,)).fetchone()
    campus = LABEL.match(label)
    if not campus:
        raise ValueError(f"source {source_id} label {label!r} names no campus: run ufabc_courses first")
    city = campus[1]
    written = conn.execute(
        "delete from staging.curriculum_courses where source_id = %s and city <> %s", (source_id, city)
    ).rowcount
    return written + curricula.load_courses(conn, "ufabc_course_page", INEP_CODE, f"UFABC, campus {city}",
                                            [(url, name, None, city)])


def _rows(xlsx):
    """Every row of the first sheet as {column letter: text}, through the workbook's shared strings."""
    with zipfile.ZipFile(xlsx) as book:
        shared = [
            "".join(t.text or "" for t in item.iter(f"{NS}t"))
            for item in ElementTree.fromstring(book.read("xl/sharedStrings.xml")).iter(f"{NS}si")
        ]
        sheet = ElementTree.fromstring(book.read("xl/worksheets/sheet1.xml"))
    for row in sheet.iter(f"{NS}row"):
        cells = {}
        for cell in row.iter(f"{NS}c"):
            value = cell.find(f"{NS}v")
            if value is not None:
                cells[cell.get("r").rstrip("0123456789")] = shared[int(value.text)] if cell.get("t") == "s" else value.text
        yield cells


def parse_curriculum(doc):
    """Return {course page slug: [(None, None, name, None, is_elective)]} from the catalog's course categories.

    The catalog publishes no term or year; hours (CH TOTAL) are in the other, main catalog.
    shortcut: hours stay None, as the engine reads one document per source; join the main catalog by code to add them.
    """
    rows = _rows(doc)
    if {k: v for k, v in next(rows, {}).items() if k in HEADER} != HEADER:
        raise ValueError("the catalog's first sheet no longer has the SIGLA, DISCIPLINA, TPEI, Curso (categoria) columns")
    entries, names = [], defaultdict(Counter)
    for row in rows:
        subject, label = " ".join((row.get("B") or "").split()), row.get("D") or ""
        codes = list(SIGLA.finditer(label))
        for code, end in zip(codes, [c.start() for c in codes[1:]] + [len(label)]):
            text = label[code.end():end]
            course, _, category = text.partition("(")
            slug = SLUGS.get(code[1], code[1].lower().replace("&", ""))
            names[slug][_key(course)] += 1
            entries.append((slug, _key(course), subject, CATEGORY.get(frozenset(re.findall(r"\b[A-Z]+\b", category)))))
    # A code that names another course ('LFIS- Licenciatura em Filosofia') is a typo: its subject is left out.
    usual = {slug: votes.most_common(1)[0][0] for slug, votes in names.items()}
    owner = {key: slug for slug, key in usual.items()}
    courses = defaultdict(set)
    for slug, key, subject, elective in entries:
        if subject and owner.get(key, slug) == slug:
            courses[slug].add((None, None, subject, None, elective))
    if not courses:
        raise ValueError("no course category found in the catalog")
    return {slug: list(subjects) for slug, subjects in courses.items()}


def load_curriculum(conn, source_id, parsed):
    """Stage each course's subjects on the course page ufabc_course_page staged; a course not staged is skipped."""
    written = 0
    for slug, subjects in parsed.items():
        row = conn.execute(
            """select cc.source_id from staging.curriculum_courses cc join sources s on s.id = cc.source_id
               where s.url = any(%s)""",
            ([f"{BASE}/cursos/{slug}", f"{BASE}/{slug}"],),
        ).fetchone()
        if row:
            written += curricula.load_subjects(conn, row[0], subjects)
    return written


# Run order: courses (list) registers the pages, course_page names and stages each course, curriculum fills subjects.
courses = SimpleNamespace(parse=parse_courses, load=load_courses)
course_page = SimpleNamespace(parse=parse_course_page, load=load_course_page)
curriculum = SimpleNamespace(parse=parse_curriculum, load=load_curriculum)
