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


def parse_curriculum(doc):
    """Return (term, year, name, None, is_elective) for every subject of the active curriculum, per etapa."""
    html = doc.read().decode("utf-8")
    # One pane per etapa and curriculum version. The selected version is the active 'Currículo <year>' tab; its
    # panel links the etapa panes of that version. A page with one version may have no version tabs.
    versions = set(re.findall(r'id="tab-content-\d+a_etapa(\d+)"', html))
    tab = re.search(r'class="nav-link active" href="#tab-content-(\d+)"', html)
    if tab:
        panel = html[html.find(f'id="tab-content-{tab[1]}"'):]
        active = re.search(r"a_etapa(\d+)", panel)[1]
    elif len(versions) == 1:
        active = next(iter(versions))
    else:
        raise ValueError(f"no active curriculum version among {sorted(versions)}")
    panes = re.split(r'<div id="tab-content-(\d+)a_etapa(\d+)"', html)
    subjects = []
    for term, version, pane in zip(panes[1::3], panes[2::3], panes[3::3]):
        if version != active:
            continue
        for row in rows(pane.split('<div id="tab-content-')[0]):
            if len(row) == 2 and row[0][0] and row[0][0] != "Disciplina":
                name = row[0][0]
                # Hours are left out: the page mixes units ('4' per subject, '440' for the internship) and states none.
                subjects.append((int(term), (int(term) + 1) // 2, name, None, name.startswith("OPTATIVA")))
    if not subjects:
        raise ValueError("no subject found on the matriz curricular")
    return subjects


courses = SimpleNamespace(
    parse=parse_courses,
    load=lambda conn, source_id, parsed: curricula.load_courses(
        conn, "mackenzie_curriculum", INEP_CODE, "Mackenzie, matriz curricular", parsed),
)
curriculum = SimpleNamespace(parse=parse_curriculum, load=curricula.load_subjects)
