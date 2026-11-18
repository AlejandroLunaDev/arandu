"""IFSP: each campus course page (Joomla HTML) and the Estrutura Curricular PDF it links on the campus Nextcloud."""

import html as entities
import re
from types import SimpleNamespace
from urllib.parse import urlsplit

import pdfplumber

from engine import curricula

INEP_CODE = 1810  # Instituto Federal de São Paulo's CO_IES in the INEP census

# Course pages give no address. Each city comes from that campus's 'Como chegar' page, e.g.
# slt.ifsp.edu.br/index.php/como-chegar: 'Avenida dos Três Poderes, n° 375 ... CEP: 13.325-047 - Salto/SP' (2026-11-17).
# shortcut: one campus verified, add a host here after reading its 'Como chegar' page when seeding its course pages.
CAMPUS_CITY = {"slt.ifsp.edu.br": "Salto"}

HEADING = re.compile(r'<h1 class="documentFirstHeading">(.*?)</h1>', re.S)
# 'Estrutura Curricular (2023)' or '- Grade Curricular 2023, reformulada-atualizada', shared on the campus Nextcloud.
# Other links (Google Drive viewer pages, which do not serve the file) are not automated.
CURRICULUM_LINK = re.compile(
    r'<a[^>]+href="https?://(nextcloud\.[a-z.]+/nextcloud/index\.php/s/[A-Za-z0-9]+)"[^>]*>'
    r'[\s-]*(?:Estrutura|Grade) Curricular\W*(\d{4})',
)
# 'FUNDAMENTOS DE MATEMÁTICA SLTFUMA 1 4 76 60,0 3,3 63,3': name, code, teachers, classes/week, classes,
# teaching, extension and total hours. Elective rows may start with their semester ('8 LIBRAS SLTLIBR ...').
SUBJECT = re.compile(r"(?:(\d{1,2}) )?(.*?) ?[A-Z][A-Z0-9]{4,7} \d+ \d+ \d+ [\d,]+ [\d,]+ ([\d,]+)")
# Each semester closes with a subtotal row; its semester marker is a merged cell the text layer drops or misplaces.
SUBTOTAL = re.compile(r"(?:Subtotal )?\d+ \d+ [\d,]+ [\d,]+ ([\d,]+)")
ROUNDING = 0.2  # hours are printed to one decimal, so a semester's sum may differ from its subtotal by a few tenths


def _text(html):
    return " ".join(entities.unescape(re.sub(r"<[^>]+>", " ", html)).split())


def parse_courses(doc):
    """Return the (pdf url, course name, None, city) of the newest curriculum one course page links, or [] if none."""
    html = doc.read().decode("utf-8")
    heading = HEADING.search(html)
    if not heading:
        raise ValueError("no course heading on the course page")
    host = urlsplit(re.search(r'<base href="([^"]+)"', html)[1]).netloc
    if host not in CAMPUS_CITY:
        raise ValueError(f"no verified city for campus {host}: read its 'Como chegar' page")
    name = re.sub(r" - Campus .+$", "", _text(heading[1]))  # 'Bacharelado em X - Campus Salto'
    links = CURRICULUM_LINK.findall(html)
    if not links:
        return []  # curriculum not on Nextcloud (e.g. Google Drive): skipped, the page stays without a curriculum
    share, _ = max(links, key=lambda link: link[1])
    # shift is left out: pages state it per curriculum version ('Integral (2019), Matutino (2023)') or as free text.
    return [(f"https://{share}/download", name, None, CAMPUS_CITY[host])]


def parse_curriculum(doc):
    """Return (term, year, name, hours, is_elective) for every subject of one Estrutura Curricular PDF."""
    with pdfplumber.open(doc) as pdf:
        lines = [line for page in pdf.pages for line in (page.extract_text() or "").splitlines()]
    elective = None
    term, term_hours = 1, 0.0
    subjects = []
    for i, line in enumerate(lines):
        if "Componente Curricular" in line:
            elective = "Optativo" in line  # 'Componente Curricular' heads the mandatory table, '... Optativo' the electives
        elif subtotal := SUBTOTAL.fullmatch(line):
            if abs(float(subtotal[1].replace(",", ".")) - term_hours) > ROUNDING:
                raise ValueError(f"semester {term} subjects add up to {term_hours:.1f} hours, its subtotal says {subtotal[1]}")
            term, term_hours = term + 1, 0.0
        elif match := SUBJECT.fullmatch(line):
            if elective is None:
                raise ValueError(f"subject row before any table header: {line!r}")
            offered, name, hours = match.groups()
            if not name:  # a name wrapped over two lines leaves the code row in between: 'X E' / 'CODE ...' / 'AUTOMAÇÃO'
                name = f"{lines[i - 1]} {lines[i + 1]}"
            subject_term = (int(offered) if offered else None) if elective else term
            hours = float(hours.replace(",", "."))
            if not elective:
                term_hours += hours
            subjects.append((subject_term, (subject_term + 1) // 2 if subject_term else None, name,
                             hours or None, elective))
    if not subjects:
        raise ValueError("no subject found in the estrutura curricular")
    if not all(1 <= s[0] <= 14 for s in subjects if s[0]):
        raise ValueError("semester out of range: the subtotal rows probably changed format")
    return subjects


courses = SimpleNamespace(
    parse=parse_courses,
    load=lambda conn, source_id, parsed: curricula.load_courses(
        conn, "ifsp_curriculum", INEP_CODE, "IFSP, estrutura curricular", parsed),
)
curriculum = SimpleNamespace(parse=parse_curriculum, load=curricula.load_subjects)
