"""USP JupiterWeb: each unit's course list and each course's grade curricular (ISO-8859-1 HTML)."""

import re
from types import SimpleNamespace
from urllib.parse import urljoin

from engine import curricula
from engine.html_table import rows

BASE = "https://uspdigital.usp.br/jupiterweb/"
INEP_CODE = 55  # USP's CO_IES in the INEP census
ENCODING = "iso-8859-1"  # declared by every JupiterWeb page


def parse_courses(doc):
    """Return (grade url, course name, shift, city) for every course on one unit's list page."""
    city = None
    courses = []
    for row in rows(doc.read().decode(ENCODING)):
        first = row[0][0] if row else ""
        if first.startswith("Campus:"):
            city = first.removeprefix("Campus:").split(" - ")[0].strip()  # 'São Paulo - Cidade Universitária ...'
        elif row and row[0][1] and "listarGradeCurricular" in row[0][1]:
            if city is None:
                raise ValueError(f"course {first!r} is listed before any campus")
            courses.append((urljoin(BASE, row[0][1]), first, row[1][0] if len(row) > 1 else None, city))
    if not courses:
        raise ValueError("no course found on the course list")
    return courses


def parse_curriculum(doc):
    """Return (term, year, name, hours, is_elective) for every subject on one grade curricular page."""
    section = term = None
    subjects = []
    for row in rows(doc.read().decode(ENCODING)):
        first = row[0][0] if row else ""
        if len(row) == 1 and first.startswith("Disciplinas "):
            section = first  # 'Disciplinas Obrigatórias', 'Disciplinas Optativas Eletivas', ...
        elif match := re.fullmatch(r"(\d+)º Período Ideal", first):
            term = int(match[1])
        elif row and row[0][1] and "obterDisciplina" in row[0][1]:
            if section is None or term is None or len(row) < 5:
                raise ValueError(f"subject row outside a section and term: {row}")
            hours = row[4][0]  # CH, the subject's total hours
            if hours and not hours.isdigit():
                raise ValueError(f"unexpected hours {hours!r} for {row[1][0]}")
            subjects.append((term, (term + 1) // 2, row[1][0], int(hours) if hours and int(hours) > 0 else None,
                             section != "Disciplinas Obrigatórias"))
    if not subjects:
        raise ValueError("no subject found on the grade curricular")
    return subjects


courses = SimpleNamespace(
    parse=parse_courses,
    load=lambda conn, source_id, parsed: curricula.load_courses(
        conn, "usp_curriculum", INEP_CODE, "USP JupiterWeb, grade curricular", parsed),
)
curriculum = SimpleNamespace(parse=parse_curriculum, load=curricula.load_subjects)
