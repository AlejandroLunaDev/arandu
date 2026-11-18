"""Unifesp: each campus's course list and each course's active matriz curricular (UTF-8 HTML)."""

import html as entities
import re
from types import SimpleNamespace

from engine import curricula
from engine.html_table import rows

INEP_CODE = 591  # Universidade Federal de São Paulo's CO_IES in the INEP census

# The pages name the campus, not its city; five campuses carry their city's name, these two a region's.
CITIES = {"BAIXADA SANTISTA": "Santos", "ZONA LESTE": "São Paulo"}
NAME_SHIFT = re.compile(r"(.+?) - (INTEGRAL|MATUTINO|VESPERTINO|NOTURNO)")
CAMPUS = re.compile(r"<strong>Campus: </strong>([^<]+)</p>")
MATRIX = re.compile(r'<span>\d+ - ([^<]+)</span>\s*<a\s+href="([^"]+)"')
TERM = re.compile(r"<strong>(\d+)&ordm; Termo</strong>")


def parse_courses(doc):
    """Return (active matriz url, course name, shift, city) for every course on one campus's list."""
    html = doc.read().decode("utf-8")
    courses = []
    for row in html.split('<td data-th="Código">')[1:]:
        label = " ".join(entities.unescape(re.search(r'<td data-th="Curso">([^<]+)</td>', row)[1]).split())
        campus = CAMPUS.search(row)
        active = [url for status, url in MATRIX.findall(row) if status.strip() == "ATIVA"]
        if not campus or len(active) != 1:
            continue  # no single active matriz (all phased out or inactive): nothing current to show
        name, shift = (match[1], match[2]) if (match := NAME_SHIFT.fullmatch(label)) else (label, None)
        city = campus[1].strip()
        courses.append((entities.unescape(active[0]), name, shift, CITIES.get(city, city)))
    if not courses:
        raise ValueError("no course with an active matriz found on the campus list")
    return courses


def parse_curriculum(doc):
    """Return (term, None, name, hours, None) for every curricular unit of one matriz, per termo.

    The matriz lists electives beside fixed units and does not mark which is which (its 'Critérios de integralização'
    give only the FIXAS and ELETIVAS hour totals), so is_elective is None.
    shortcut: year is None, as no page says how long a termo lasts; set (term + 1) // 2 once a source confirms
    termos are semesters.
    """
    page = doc.read().decode("utf-8")
    parts = TERM.split(page.split("Critérios de integralização</strong></h5>")[0])
    if "Não há detalhes da estrutura curricular" in page:
        raise ValueError("the matriz publishes no curricular structure ('Não há detalhes da estrutura curricular')")
    if len(parts) == 1 and "<strong>Formação complementar</strong>" in page:
        # ABI entry courses (Guarulhos) publish one pool of units with no termo: nothing says when each is taken.
        raise ValueError("the matriz lists only a 'Formação complementar' pool, with no termo")
    subjects = []
    for term, chunk in zip(parts[1::2], parts[2::2]):
        for row in rows(chunk):
            # Unit rows: Código, Matéria, CH Teórica, CH Prática, CH Total, Extensão, Ações. Hidden prerequisite and
            # equivalence tables nest two-cell rows.
            if len(row) == 7 and row[0][0].isdigit():
                hours = row[4][0]
                if not hours.isdigit():
                    raise ValueError(f"unexpected hours {hours!r} for {row[1][0]}")
                subjects.append((int(term), None, row[1][0], int(hours) or None, None))
    if not subjects:
        raise ValueError("no curricular unit found on the matriz")
    return subjects


courses = SimpleNamespace(
    parse=parse_courses,
    load=lambda conn, source_id, parsed: curricula.load_courses(
        conn, "unifesp_curriculum", INEP_CODE, "Unifesp, matriz curricular", parsed),
)
curriculum = SimpleNamespace(parse=parse_curriculum, load=curricula.load_subjects)
