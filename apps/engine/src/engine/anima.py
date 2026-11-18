"""Ânima Educação (São Judas, Anhembi Morumbi): sitemap, each course page's Nuxt state, each campus's PDF matrix."""

import json
import re
from types import SimpleNamespace
from urllib.parse import urlsplit

import pdfplumber

from engine import curricula

# Each site's host, its institution's CO_IES in the INEP census and its label.
INSTITUTIONS = {"www.usjt.br": (203, "São Judas"), "portal.anhembi.br": (466, "Anhembi Morumbi")}

COURSE_PAGE = re.compile(r"<loc>\s*(https://([^/<]+)/cursos/graduacao/([a-z0-9-]+)/)\s*</loc>")
CANONICAL = re.compile(r'<link rel="canonical" href="https://([^/"]+)/')
NUXT_DATA = re.compile(r'<script[^>]*id="__NUXT_DATA__"[^>]*>(.*?)</script>', re.S)
WRAPPERS = {"Reactive", "ShallowReactive", "Ref", "ShallowRef"}
SEMESTERS = re.compile(r"Semestres (\d+) - (\d+)")


def parse_sitemap(doc):
    """Return the url of every graduação course page on one site's sitemap, transfer variants left out."""
    pages = [(url, host) for url, host, slug in COURSE_PAGE.findall(doc.read().decode("utf-8"))
             if not slug.endswith("-transferencia")]  # the same course, sold to students moving in
    if not pages:
        raise ValueError("no course page found on the sitemap")
    if unknown := {host for _, host in pages} - INSTITUTIONS.keys():
        raise ValueError(f"course pages on unknown hosts {sorted(unknown)}")
    return [url for url, _ in pages]


def load_pages(conn, source_id, urls):
    """Register each course page as a source of anima_course."""
    written = 0
    for url in urls:
        parts = urlsplit(url)
        label = f"{INSTITUTIONS[parts.netloc][1]}, página do curso {parts.path.rstrip('/').rsplit('/', 1)[-1]}"
        written += conn.execute(
            """insert into sources (adapter, url, label) values (%s, %s, %s)
               on conflict (url) do update set label = excluded.label where sources.label is distinct from excluded.label""",
            ("anima_course", url, label),
        ).rowcount
    return written


def _node(data, i):
    """One node of Nuxt's devalue payload, Reactive/Ref wrappers unwrapped; its values are still indexes."""
    while isinstance(data[i], list) and data[i] and data[i][0] in WRAPPERS:
        i = data[i][1]
    return data[i]


def _revive(data, i):
    if i < 0:
        return None  # devalue's undefined, NaN and infinities
    value = _node(data, i)
    if isinstance(value, list):
        # shortcut: Set, Map and Date forms read as None, the course fields used here are none of them
        return None if value and isinstance(value[0], str) else [_revive(data, x) for x in value]
    if isinstance(value, dict):
        return {key: _revive(data, x) for key, x in value.items()}
    return value


def parse_course(doc):
    """Return ((CO_IES, label), [(pdf url, course name, shifts, city)]), one per presencial unit with its own matrix."""
    html = doc.read().decode("utf-8")
    host = CANONICAL.search(html)
    if not host or host[1] not in INSTITUTIONS:
        raise ValueError(f"unknown canonical host {host and host[1]}")
    data = json.loads(NUXT_DATA.search(html)[1])
    state = _node(data, _node(data, 0)["state"])
    page = _node(data, state["$sbreadcrumb-course"])  # read field by field: coordinators are personal data
    title, degree = _revive(data, page["title"]), _revive(data, page["degree"])
    name = f"{title} - {degree}" if degree in ("Bacharelado", "Licenciatura") else title  # the link rule's form
    units = {}  # presencial unit -> (city, turns), from the offers the page lists per campus
    for campus in _revive(data, page["campus"]):
        for offer in campus["offers"]:
            if offer["modality"] == "Presencial" and (campus["city"] or "").strip():  # no city, no link: skipped
                units.setdefault(offer["unit"]["title"], (campus["city"].strip(), set()))[1].add(offer["turn"] or "")
    courses = {}
    for matrix in _revive(data, page["curriculums"]):
        if matrix["modality"] == "Presencial" and matrix["unit"] in units:
            city, turns = units[matrix["unit"]]
            courses.setdefault(matrix["curriculum_file"], (name, ", ".join(sorted(turns - {""})) or None, city))
    # Units with presencial offers but no matrix of their own, and matrices of units with no presencial offer,
    # are left out: the page does not say which matrix the first serve or where the second are taught.
    return INSTITUTIONS[host[1]], [(url, *offer) for url, offer in courses.items()]


def parse_curriculum(doc):
    """Return (term, year, name, hours, None, term_to) for every component of one 'Matriz Curricular' PDF.

    Components come in blocks labeled 'Semestres a - b'; TIPO (U.C., AFP, EXT, UC. EXP., UCDP) names a component
    kind, never mandatory or elective, so is_elective stays None.
    """
    subjects, pending, columns = [], [], None
    with pdfplumber.open(doc) as pdf:
        for page in pdf.pages:
            for table in page.extract_tables():
                for row in table:
                    cells = [" ".join((cell or "").split()) for cell in row]
                    if "TIPO" in cells:  # a block header; the summary table's has no DENOMINAÇÃO and ends the matrix
                        if pending:
                            raise ValueError(f"components with no 'Semestres' label: {pending}")
                        columns = (cells.index("DENOMINAÇÃO"), cells.index("TOTAL CH")) if "DENOMINAÇÃO" in cells else None
                        continue
                    if columns is None:
                        continue
                    name, total = cells[columns[0]], cells[columns[1]]
                    if name:
                        pending.append((name, int(total) if total.isdigit() and int(total) > 0 else None))
                    if label := SEMESTERS.search(cells[0]):  # the block's label sits in its last row
                        first, last = int(label[1]), int(label[2])
                        year = (first + 1) // 2 if (first + 1) // 2 == (last + 1) // 2 else None
                        subjects += [(first, year, name, hours, None, last if last > first else None)
                                     for name, hours in pending]
                        pending = []
    if pending:
        raise ValueError(f"components with no 'Semestres' label: {pending}")
    if not subjects:
        raise ValueError("no component found on the matriz curricular")
    return subjects


sitemap = SimpleNamespace(parse=parse_sitemap, load=load_pages)
course = SimpleNamespace(
    parse=parse_course,
    load=lambda conn, source_id, parsed: curricula.load_courses(
        conn, "anima_curriculum", parsed[0][0], f"{parsed[0][1]}, matriz curricular", parsed[1]),
)
curriculum = SimpleNamespace(parse=parse_curriculum, load=curricula.load_subjects)
