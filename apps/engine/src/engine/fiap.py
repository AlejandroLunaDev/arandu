"""FIAP: the graduação course list and each course page's matriz curricular, grouped by year (Next.js HTML).

Each subject of the matriz carries a short description, kept as the discipline's one topic: it is all FIAP publishes
of a subject's program, and the book shows it as the subject's theme (owner, 2026-11-19).
"""

import html as entities
import re
from types import SimpleNamespace

from engine import curricula

BASE = "https://www.fiap.com.br"
INEP_CODE = 852  # FIAP - Centro Universitário's CO_IES in the INEP census

COURSE_LINK = re.compile(
    r'<a[^>]+href="(?:https://www\.fiap\.com\.br)?(/graduacao/(?:bacharelado|tecnologo|licenciatura)/[a-z0-9-]+)/?"[^>]*>(.*?)</a>',
    re.S,
)
# The page's JSON-LD (escaped inside the Next.js payload) gives each campus's addressLocality.
LOCALITY = re.compile(r'addressLocality\\*"\s*:\s*\\*"([^"\\]+)')
YEAR = re.compile(r'class="styles_grade-year[^"]*">(\d+)<!-- -->º Ano</p>')
MODULE_TITLE = re.compile(r'class="styles_module-title[^"]*">([^<]+)</p>')
# A module's description sits in its dropdown, before the next module starts.
MODULE = re.compile(
    r'class="styles_module-title[^"]*">([^<]+)</p>(?:(?!styles_module-title).)*?'
    r'class="styles_module-description[^"]*">(.*?)</p>',
    re.S,
)


def _text(html):
    return " ".join(entities.unescape(re.sub(r"<[^>]+>", " ", html)).split())


def parse_courses(doc):
    """Return (course url, course name, None, city) for every course on the list page."""
    html = doc.read().decode("utf-8")
    cities = set(LOCALITY.findall(html))
    if len(cities) != 1:
        raise ValueError(f"expected one campus city on the course list, found {sorted(cities)}")
    city = cities.pop()
    courses = {}
    for path, label in COURSE_LINK.findall(html):
        name = _text(label)
        if name and name != "Quero saber mais":  # the call-to-action link repeats the course url
            courses.setdefault(f"{BASE}{path}/", name)
    if not courses:
        raise ValueError("no course found on the course list")
    return [(url, name, None, city) for url, name in courses.items()]


def parse_curriculum(doc):
    """Return (None, year, name, None, False) for every subject: FIAP publishes years, not terms or hours."""
    return _subjects(doc.read().decode("utf-8"))


def _subjects(html):
    years = YEAR.split(html)  # [before, year, chunk, year, chunk, ...]
    subjects = [
        (None, int(year), " ".join(entities.unescape(title).split()), None, False)
        for year, chunk in zip(years[1::2], years[2::2])
        for title in MODULE_TITLE.findall(chunk)
    ]
    if not subjects:
        raise ValueError("no subject found on the matriz curricular")
    return subjects


courses = SimpleNamespace(
    parse=parse_courses,
    load=lambda conn, source_id, parsed: curricula.load_courses(
        conn, "fiap_curriculum", INEP_CODE, "FIAP, matriz curricular", parsed,
        every_unit=True),  # one matriz per course, no campus: it serves both census rows (owner, 2026-11-18)
)
def parse_page(doc):
    """Return (subjects, descriptions): parse_curriculum's subjects and a (name, description) per described subject."""
    html = doc.read().decode("utf-8")
    descriptions = {}
    for title, text in MODULE.findall(html):
        name, description = " ".join(entities.unescape(title).split()), _text(text)
        if description:
            descriptions.setdefault(name, description)  # a name listed twice keeps its first description
    return _subjects(html), list(descriptions.items())


def load_page(conn, source_id, parsed):
    """Store each described subject as a discipline of this page, then load the subjects, which links them by name."""
    return curricula.load_described(conn, source_id, parsed, INEP_CODE, BASE)


curriculum = SimpleNamespace(parse=parse_page, load=load_page)
