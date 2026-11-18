"""Mackenzie: the graduação course list and each course's matriz curricular (UTF-8 HTML)."""

import html as entities
import re
from types import SimpleNamespace

from engine import curricula
from engine.html_table import rows

BASE = "https://www.mackenzie.br"
INEP_CODE = 22  # Universidade Presbiteriana Mackenzie's CO_IES in the INEP census

# The footer publishes each campus's address: its /universidade/<slug>/ link, then locality ("Bairro, City") and region.
ADDRESS = re.compile(
    r'universidade/([a-z0-9-]+)/".*?itemprop="addressLocality">([^<]+)<.*?itemprop="addressRegion">([^<]+)<', re.S
)
COURSE_LINK = re.compile(r'<a[^>]+href="/graduacao/([a-z0-9-]+)/([a-z0-9-]+)"[^>]*>(.*?)</a>', re.S)


def _text(html):
    return " ".join(entities.unescape(re.sub(r"<[^>]+>", " ", html)).split())


def parse_courses(doc):
    """Return (matriz url, course name, None, city) for every course on a campus whose address is in SP."""
    html = doc.read().decode("utf-8")
    cities = {
        slug: locality.rsplit(",", 1)[-1].strip()
        for slug, locality, region in ADDRESS.findall(html)
        if region.strip() == "SP"
    }
    if not cities:
        raise ValueError("no SP campus address found on the course list")
    # Courses on a campus with no published address (EaD, other states) are left out: their city is unknown.
    courses = {}
    for slug, course, label in COURSE_LINK.findall(html):
        if slug in cities and _text(label):
            courses.setdefault(f"{BASE}/graduacao/{slug}/{course}/matriz-curricular", (_text(label), cities[slug]))
    if not courses:
        raise ValueError("no course found on the course list")
    return [(url, name, None, city) for url, (name, city) in courses.items()]


TAB = re.compile(r'href="#tab-content-([^"]+)"[^>]*>\s*([^<]*?)\s*<')
ACTIVE_TAB = re.compile(r'class="nav-link active" href="#tab-content-([^"]+)"')


def parse_curriculum(doc):
    """Return (term, year, name, None, is_elective) for every subject of the active curriculum, per etapa.

    Version tabs ('Currículo 2026', '2018', '2014 - 2017') each hold their own 'Nª Etapa' tabs; the selected version is
    the active one. A page with one version may have no version tabs. Etapa panes list subjects as table rows or as
    paragraphs, depending on the course.
    """
    html = doc.read().decode("utf-8")
    tabs = [(match.start(), match[1], match[2]) for match in TAB.finditer(html)]
    etapas = {tab: int(match[1]) for _, tab, label in tabs if (match := re.fullmatch(r"(\d+)ª Etapa", label))}
    first_etapa = min((pos for pos, tab, _ in tabs if tab in etapas), default=0)
    # Version tabs come before the first etapa tab; later non-etapa tabs ('Optativas') sit inside a version.
    versions = [tab for pos, tab, _ in tabs if tab not in etapas and pos < first_etapa]
    start, end = 0, len(html)
    if versions:
        active = next((tab for tab in ACTIVE_TAB.findall(html) if tab in versions), None)
        if active is None:
            raise ValueError(f"no active curriculum version among {versions}")
        start = html.index(f'id="tab-content-{active}"')
        end = min([pos for tab in versions if (pos := html.find(f'id="tab-content-{tab}"')) > start] or [end])
    subjects = []
    for tab, term in etapas.items():
        pane_start = html.find(f'id="tab-content-{tab}"')
        if not start <= pane_start < end:
            continue  # an etapa of another version
        stop = html.find('id="tab-content-', pane_start + 1)
        pane = html[pane_start:stop if stop > 0 else None]
        names = [row[0][0] for row in rows(pane) if len(row) == 2 and row[0][0] and row[0][0] != "Disciplina"]
        names = names or [text for p in re.findall(r"<p>(.*?)</p>", pane, re.S) if (text := _text(p))]
        # Hours are left out: the page mixes units ('4' per subject, '440' for the internship) and states none.
        subjects += [(term, (term + 1) // 2, name, None, name.upper().startswith(("OPTATIVA", "ELETIVA")))
                     for name in names]
    if not subjects:
        raise ValueError("no subject found on the matriz curricular")
    return subjects


courses = SimpleNamespace(
    parse=parse_courses,
    load=lambda conn, source_id, parsed: curricula.load_courses(
        conn, "mackenzie_curriculum", INEP_CODE, "Mackenzie, matriz curricular", parsed),
)
curriculum = SimpleNamespace(parse=parse_curriculum, load=curricula.load_subjects)
