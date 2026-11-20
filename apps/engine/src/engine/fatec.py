"""Fatecs (Centro Paula Souza): each unit's WordPress media API lists its PPC PDFs, and a PPC's matriz curricular
gives the 1º semestre subjects (owner, 2026-11-18: one or two first-semester subjects per profession are enough).

Each unit is its own census institution; the migration seeds every unit's media searches with its CO_IES in
staging.fatec_documents, and a listed PDF inherits it.
"""

import json
import re
import unicodedata
from types import SimpleNamespace

import pdfplumber

from engine import curricula

PDF_NAME = re.compile(r"(?i)ppc|projeto.?pedag|grade|matriz")
# Timetables, calendars, the AMS high-school track and bibliography lists are not a course's matriz.
NOT_A_MATRIZ = re.compile(r"(?i)hor[aá]ri|calend|ams|refer[eê]ncia")
URL_DATE = re.compile(r"/(\d{4})/(\d{2})/")
# A subject ends at its '(80 aulas)' mark; older matrices write the weekly count, '(4)'.
MARK = re.compile(r"\(\s*\d{2,3}\s*aulas?\b[^)]*\)|\(\s*\d{1,2}\s*\)", re.I)
LEAD = re.compile(r"^(?:[A-Z]\)|R|-|E|–)\s+")  # legend letters the grid prints before a name
END_OF_COLUMN = re.compile(r"(?i)^(aulas:|total|carga|resumo|atividades|legenda|est[aá]gio|tg|trabalho de gradua"
                           r"|disciplinas? optativ|eletiv)")
NOT_A_NAME = re.compile(r"(?i)[•🢒]|existente|xxx|semestre|^r\s*=|^legenda")


def _key(text):
    text = unicodedata.normalize("NFKD", text.lower())
    return " ".join("".join(c for c in text if not unicodedata.combining(c)).split())


def parse_media(doc):
    """Return the PPC-like PDF urls one media search lists."""
    urls = {item["source_url"] for item in json.load(doc)}
    return sorted(u for u in urls
                  if u.lower().endswith(".pdf") and PDF_NAME.search(u.rsplit("/", 1)[1])
                  and not NOT_A_MATRIZ.search(u.rsplit("/", 1)[1]))


def load_media(conn, source_id, urls):
    """Register each PDF as a fatec_curriculum source of the unit the search belongs to."""
    inep_code = conn.execute(
        "select institution_inep_code from staging.fatec_documents where source_id = %s", (source_id,)).fetchone()[0]
    written = 0
    for url in urls:
        written += conn.execute(
            """insert into sources (adapter, url, label) values ('fatec_curriculum', %s, %s)
               on conflict (url) do nothing""",
            (url, f"Fatec (CO_IES {inep_code}), PDF: {url.rsplit('/', 1)[1]}"),
        ).rowcount
        written += conn.execute(
            """insert into staging.fatec_documents (source_id, institution_inep_code)
               select id, %s from sources where url = %s
               on conflict (source_id) do update set institution_inep_code = excluded.institution_inep_code
                 where fatec_documents.institution_inep_code <> excluded.institution_inep_code""",
            (inep_code, url),
        ).rowcount
    return written


def _headers(words):
    """(semester, x0, top) of each 'Nº semestre' header, written as one word or two."""
    found = []
    for a, b in zip(words, words[1:]):
        if re.fullmatch(r"\d\s*[º°o]?", a["text"]) and re.match(r"(?i)sem", b["text"]) and abs(a["top"] - b["top"]) < 3:
            found.append((int(a["text"][0]), a["x0"], a["top"]))
        elif match := re.fullmatch(r"(\d)\s*[º°o]\s*sem\w*", a["text"], re.I):
            found.append((int(match[1]), a["x0"], a["top"]))
    return found


def _first_semester(pdf):
    """Names in the '1º semestre' column of the matriz grid (one column per semester), cut at each '(N aulas)'."""
    for page in pdf.pages:
        words = page.extract_words()
        heads = _headers(words)
        # The grid's header row has a 1º and a 2º semestre at the same height.
        first = [h for h in heads if h[0] == 1 and any(o[0] == 2 and abs(o[2] - h[2]) < 4 for o in heads)]
        if not first:
            continue
        _, x0, top = first[0]
        right = min((h[1] for h in heads if abs(h[2] - top) < 4 and h[1] > x0 + 5), default=page.width)
        column = sorted((w for w in words if w["top"] > top + 5 and w["x0"] >= x0 - 25 and w["x1"] <= right - 2),
                        key=lambda w: (round(w["top"]), w["x0"]))
        names, pending = [], []
        for word in column:
            if END_OF_COLUMN.match(word["text"]) and not pending:
                break
            pending.append(word["text"])
            text = " ".join(pending)
            if MARK.search(text):
                name = MARK.split(text)[0].strip(" -–.;,(")
                name = LEAD.sub("", LEAD.sub("", name).strip(" -–.;,(")).strip(" -–.;,(")
                if name:
                    names.append(name)
                pending = []
        if names:
            return list(dict.fromkeys(names))
    return []


def parse_curriculum(doc):
    """Return (title text, subjects): the first pages' text, where the course is named, and the 1º semestre subjects.

    The grid is read by position, so a name is kept only when the ementário names it again: a grid whose cells
    were cut or merged differently fails and is listed for review instead of storing a name the PPC never states.
    """
    with pdfplumber.open(doc) as pdf:
        names = _first_semester(pdf)
        whole = _key(" ".join((page.extract_text() or "") for page in pdf.pages))
        title = " ".join((page.extract_text() or "") for page in pdf.pages[:3])
    if not names:
        raise ValueError("no 1º semestre column in a matriz grid")
    if bad := [n for n in names if NOT_A_NAME.search(n) or not 4 <= len(n) <= 90]:
        raise ValueError(f"the 1º semestre column was not read cleanly: {bad[:3]}")
    if not 3 <= len(names) <= 12:
        raise ValueError(f"{len(names)} subjects in the 1º semestre column: the grid was not read")
    if unseen := [n for n in names if whole.count(_key(n)) < 2]:
        raise ValueError(f"names the PPC does not state again: {unseen[:3]}")
    return title, [(1, 1, name, None, False) for name in names]


def load_curriculum(conn, source_id, parsed):
    """Stage the PDF as the census course its cover names ('Tecnologia em X'), and its subjects.

    A unit may keep older PPCs of the same course online; the newest by upload month is the one staged.
    """
    title, subjects = parsed
    url, inep_code = conn.execute(
        """select s.url, d.institution_inep_code from sources s join staging.fatec_documents d on d.source_id = s.id
           where s.id = %s""", (source_id,)).fetchone()
    course = conn.execute(
        """select c.name, c.city from public.courses c join public.institutions i on i.id = c.institution_id
           where i.inep_code = %s and c.degree = 'tecnologico'
             and position('tecnologia em ' || staging.name_key(c.name) in staging.name_key(%s)) > 0
           order by length(c.name) desc limit 1""",
        (inep_code, title)).fetchone()
    if course is None:
        raise ValueError(f"the cover names no census course of CO_IES {inep_code}")
    name, city = course
    staged = conn.execute(
        """select cc.source_id, s.url from staging.curriculum_courses cc join sources s on s.id = cc.source_id
           where s.adapter = 'fatec_curriculum' and cc.institution_inep_code = %s and cc.source_id <> %s
             and staging.name_key(cc.name) = staging.name_key(%s)""",
        (inep_code, source_id, f"Tecnologia em {name}")).fetchall()
    mine = (_month(url), source_id)
    if any((_month(other), other_id) > mine for other_id, other in staged):
        return _unstage(conn, source_id)  # shortcut: a newer PPC that later fails the reader leaves this one unstaged
    written = sum(_unstage(conn, other_id) for other_id, _ in staged)
    written += curricula.load_courses(conn, "fatec_curriculum", inep_code, "Fatec, PPC",
                                      [(url, f"Tecnologia em {name}", None, city)])
    return written + curricula.load_subjects(conn, source_id, subjects)


def _month(url):
    match = URL_DATE.search(url)
    return match[1] + match[2] if match else ""


def _unstage(conn, source_id):
    """Drop a superseded PPC's staged course and subjects, and its links."""
    conn.execute("delete from staging.curriculum_subjects where source_id = %s", (source_id,))
    conn.execute("delete from staging.curriculum_courses where source_id = %s", (source_id,))
    return conn.execute("select staging.normalize_curriculum(%s)", (source_id,)).fetchone()[0]


media = SimpleNamespace(parse=parse_media, load=load_media)
curriculum = SimpleNamespace(parse=parse_curriculum, load=load_curriculum)
