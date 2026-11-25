"""FAC-SP (Faculdade do Comércio de São Paulo): each course's estrutura curricular PDF, grouped by período."""

import re
from types import SimpleNamespace

import pdfplumber

from engine import curricula

INEP_CODE = 23147  # Faculdade do Comércio de São Paulo's CO_IES in the INEP census
ADAPTER = "facsp_curriculum"

COURSE = re.compile(r"ESTRUTURA CURRICULAR DO (CURSO .+?)\s*\n\s*1º\s*-\s*PERÍODO", re.S)
TERM = re.compile(r"^(\d+)º\s*-\s*PERÍODO\b")
# A subject line: its name, then the theory, practice and total hours (the last figure is the total).
SUBJECT = re.compile(r"^(.+?)\s+(?:\d{1,3}\s+){1,2}(\d{1,3})$")
NOT_SUBJECT = re.compile(r"^(SUBTOTAL|TOTAL|TEÓRICA|Atividades complementares|Certificação)", re.I)


def parse_curriculum(doc):
    """Return (course name, 'São Paulo', [(term, None, name, hours, is_elective)]) from one PDF."""
    with pdfplumber.open(doc) as pdf:
        text = "\n".join(page.extract_text() or "" for page in pdf.pages)
    course = COURSE.search(text)
    if not course:
        raise ValueError("no course title before the first período")
    name = " ".join(course[1].split()).title()
    term, subjects = None, []
    for line in (line.strip() for line in text.splitlines()):
        if found := TERM.match(line):
            term = int(found[1])
        elif term and not NOT_SUBJECT.match(line) and (subject := SUBJECT.match(line)):
            optional = subject[1].upper() == "OPTATIVA"
            subjects.append((term, None, "Optativa" if optional else subject[1], int(subject[2]), optional))
    if not subjects:
        raise ValueError("no subject found in the estrutura curricular")
    return name, "São Paulo", subjects  # FAC-SP has one campus, in São Paulo city


curriculum = SimpleNamespace(
    parse=parse_curriculum,
    load=lambda conn, source_id, parsed: curricula.load_page(
        conn, source_id, ADAPTER, INEP_CODE, "FAC-SP, estrutura curricular", parsed),
)
