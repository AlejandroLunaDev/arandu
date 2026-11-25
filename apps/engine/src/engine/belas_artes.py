"""Belas Artes (FEBASP): each graduação course page's matriz curricular (WordPress/Elementor HTML).

The matriz lists its blocks in order with a theme for a title ('EXPERIMENTAÇÃO', 'MATERIALIZAÇÃO'), not a term, and
the page states the course's length ('Duração 8 Semestres'). A block is a semester only when the page has exactly as
many blocks as stated semesters; any other page is rejected rather than guessed.
"""

import html as entities
import re
from types import SimpleNamespace

from engine import curricula

INEP_CODE = 162  # Centro Universitário Belas Artes de São Paulo's CO_IES in the INEP census
ADAPTER = "belas_artes_curriculum"

TITLE = re.compile(r'<h1[^>]*>(.*?)</h1>', re.S)
CAMPUS = re.compile(r"Campus\s+(Vila Mariana|Paraíso|Votorantim|Sorocaba)\b")
DURATION = re.compile(r"Duração\s+(\d+)\s+Semestres")
# Each block is a table: a title row, the 'DISCIPLINAS HORAS' header (with 'Tipo' on in-person pages), one row per
# subject (its type after its hours there), then 'SUBTOTAL'.
BLOCK = re.compile(r"(?:^|\n)([^\n]*)\nDISCIPLINAS\nHORAS\n(?:Tipo\n)?(.*?)\nSUBTOTAL\n", re.S)
SUBJECT = re.compile(r"^(.+)\n(\d{1,3})(?:\n(?:Presencial|EAD|Semipresencial))?$", re.M)
NOT_SUBJECT = "ATIVIDADES COMPLEMENTARES"  # hours to fill, not a subject
CITY = {"Vila Mariana": "São Paulo", "Paraíso": "São Paulo", "Votorantim": "Votorantim", "Sorocaba": "Sorocaba"}


def _lines(html):
    html = re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", " ", html)
    html = re.sub(r"(?i)</?(tr|li|p|br|div|h\d|td|th)[^>]*>", "\n", html)
    lines = (" ".join(entities.unescape(re.sub(r"<[^>]+>", " ", line)).split()) for line in html.splitlines())
    return "\n".join(line for line in lines if line)


def parse_curriculum(doc):
    """Return (course name, city, [(term, None, name, hours, False)]) from one matriz page."""
    html = doc.read().decode("utf-8")
    title = TITLE.search(html)
    if not title:
        raise ValueError("no course title on the page")
    name = " ".join(entities.unescape(re.sub(r"<[^>]+>", " ", title[1])).split())
    text = _lines(html)
    duration = DURATION.search(text)
    if not duration:
        raise ValueError("the page states no length in semesters")
    if re.search(r"Modalidade\s+EAD\b", text):
        city = "São Paulo"  # a distance course is the seat's: its census row has no city
    else:
        campus = CAMPUS.search(text)
        if not campus:
            raise ValueError("the page states no campus")
        city = CITY[campus[1]]
    blocks = BLOCK.findall(text[text.find("MATRIZ CURRICULAR"):])
    if len(blocks) != int(duration[1]):
        raise ValueError(f"{len(blocks)} blocks for {duration[1]} semesters: the blocks are not the terms")
    subjects = [
        (term, None, subject, int(hours), subject == "OPTATIVAS")
        for term, (_, rows) in enumerate(blocks, start=1)
        for subject, hours in SUBJECT.findall(rows)
        if subject != NOT_SUBJECT
    ]
    if not subjects:
        raise ValueError("no subject found on the matriz curricular")
    return name, city, subjects


curriculum = SimpleNamespace(
    parse=parse_curriculum,
    load=lambda conn, source_id, parsed: curricula.load_page(
        conn, source_id, ADAPTER, INEP_CODE, "Belas Artes, matriz curricular", parsed),
)
