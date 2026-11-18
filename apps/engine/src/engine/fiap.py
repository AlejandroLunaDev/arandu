"""FIAP: the graduação course list and each course page's matriz curricular, grouped by year (Next.js HTML)."""

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
    html = doc.read().decode("utf-8")
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
curriculum = SimpleNamespace(parse=parse_curriculum, load=curricula.load_subjects)
