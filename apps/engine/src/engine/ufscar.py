"""UFSCar ProGrad: course list, each course's campus pages, and each campus page's matriz curricular PDF (Plone)."""

import html as entities
import re
from types import SimpleNamespace

import pdfplumber

from engine import curricula

INEP_CODE = 7  # Universidade Federal de São Carlos's CO_IES in the INEP census
COURSES = "https://www.prograd.ufscar.br/pt-br/cursos/cursos-oferecidos/"

COURSE_LINK = re.compile(r'<a[^>]+href="(' + re.escape(COURSES) + r'([a-z0-9-]+)/\2)"[^>]*>(.*?)</a>', re.S)
CAMPUS_LINK = re.compile(r'<p class="campuscurso"><a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', re.S)
HEADING = re.compile(r'<h1 class="documentFirstHeading">(.*?)</h1>', re.S)
FIELD = r"<strong>{}:?</strong>:?\s*(.*?)</li>"
MATRIZ_LINK = re.compile(r'<a[^>]+href="([^"]+\.pdf)"[^>]*>\s*(?:<strong>)?\s*Matriz Curricular', re.S)
TERM = re.compile(r"(\d+)º Semestre")
KINDS = ("Obrigatório", "Optativo", "Eletivo")  # Caráter; 'Obrigatório (ou TCC)' reads as Obrigatório


def _text(html):
    return " ".join(entities.unescape(re.sub(r"<[^>]+>", " ", html)).split())


def _register(conn, adapter, pages):
    """Register each (url, label) page as a source of adapter; return the rows written."""
    return sum(
        conn.execute(
            """insert into sources (adapter, url, label) values (%s, %s, %s)
               on conflict (url) do update set label = excluded.label where sources.label is distinct from excluded.label""",
            (adapter, url, label),
        ).rowcount
        for url, label in pages
    )


def parse_list(doc):
    """Return (course page url, label) for every course on the ProGrad course list."""
    courses = {url: f"UFSCar, curso: {_text(label)}" for url, _, label in COURSE_LINK.findall(doc.read().decode("utf-8"))}
    if not courses:
        raise ValueError("no course found on the course list")
    return list(courses.items())


def parse_course(doc):
    """Return (campus page url, label) for every campus a course page links."""
    html = doc.read().decode("utf-8")
    name = _text(HEADING.search(html)[1])
    campuses = [(url, f"UFSCar, campus: {name} - {_text(label)}") for url, label in CAMPUS_LINK.findall(html)]
    if not campuses:
        raise ValueError(f"no campus link on the course page of {name!r}")
    return campuses


def parse_campus(doc):
    """Return the (matriz url, course name, shift, city) of one campus page, read from its own fields."""
    html = doc.read().decode("utf-8")
    heading = _text(HEADING.search(html)[1])  # 'Ciência da Computação - São Carlos'
    name, sep, city = heading.rpartition(" - ")
    if not sep:
        raise ValueError(f"no campus in the heading {heading!r}")
    kind = re.search(FIELD.format("Tipo"), html)
    if kind and _text(kind[1]) in ("Bacharelado", "Licenciatura"):
        name = f"{name} - {_text(kind[1])}"  # the link rule reads the degree from this suffix
    shift = re.search(FIELD.format("Turno"), html)
    # shortcut: the newest matriz is taken as the last one listed ('A Partir 2019', then 'A Partir de 2026'),
    # check the order if a page lists them otherwise.
    links = MATRIZ_LINK.findall(html)
    if not links:
        raise ValueError(f"no matriz curricular PDF on the campus page of {heading!r}")
    return [(links[-1], name, _text(shift[1]) if shift else None, city)]


def _lines(page):
    """The page's words grouped into lines, top to bottom."""
    lines = []
    for word in sorted(page.extract_words(), key=lambda w: (round(w["top"]), w["x0"])):
        if lines and word["top"] - lines[-1][0]["top"] < 3:
            lines[-1].append(word)
        else:
            lines.append([word])
    return [sorted(line, key=lambda w: w["x0"]) for line in lines]


def parse_curriculum(doc):
    """Return (term, year, name, hours, is_elective) for every subject of a matriz PDF.

    A PDF drawn as vector outlines has no text: it returns no subject and stays empty until OCR is added.
    """
    subjects = []
    with pdfplumber.open(doc) as pdf:
        if not any(page.chars for page in pdf.pages):
            return []  # shortcut: outlined PDFs are skipped, add OCR when they are worth the cost
        term = None
        for page in pdf.pages:
            columns = current = None
            for line in _lines(page):
                texts = [w["text"] for w in line]
                text = " ".join(texts)
                if match := TERM.match(text):
                    term, current = int(match[1]), None
                elif "Disciplina" in texts and "Requisitos" in texts:
                    columns = {w["text"]: w["x0"] - 2 for w in line}  # header x positions of nº, Disciplina, Requisitos
                    current = None
                elif columns is None:
                    continue
                elif texts[0].isdigit() and line[0]["x0"] < columns["Disciplina"]:
                    if term is None:
                        raise ValueError(f"subject row before any semester header: {text!r}")
                    name = [w["text"] for w in line if columns["Disciplina"] <= w["x0"] < columns["Requisitos"]]
                    kind = next((w["text"] for w in line if w["x0"] >= columns["Requisitos"] and w["text"] in KINDS), None)
                    if kind is None:
                        raise ValueError(f"no Caráter in {text!r}")
                    hours = texts[-1]  # the Total column is the rightmost
                    current = [term, name, int(hours) if hours.isdigit() else None, kind != "Obrigatório", line[0]["top"]]
                    subjects.append(current)
                elif current and line[0]["top"] - current[4] < 20:
                    # A wrapped cell: its Disciplina words continue the subject's name.
                    current[1] += [w["text"] for w in line if columns["Disciplina"] <= w["x0"] < columns["Requisitos"]]
                    current[4] = line[0]["top"]
                else:
                    current = None
    if not subjects:
        raise ValueError("no subject found in the matriz curricular PDF")
    return [(term, (term + 1) // 2, " ".join(name), hours, elective) for term, name, hours, elective, _ in subjects]


courses = SimpleNamespace(parse=parse_list, load=lambda conn, source_id, parsed: _register(conn, "ufscar_course", parsed))
course = SimpleNamespace(parse=parse_course, load=lambda conn, source_id, parsed: _register(conn, "ufscar_campus", parsed))
campus = SimpleNamespace(
    parse=parse_campus,
    load=lambda conn, source_id, parsed: curricula.load_courses(
        conn, "ufscar_curriculum", INEP_CODE, "UFSCar, matriz curricular", parsed),
)
curriculum = SimpleNamespace(parse=parse_curriculum, load=curricula.load_subjects)
