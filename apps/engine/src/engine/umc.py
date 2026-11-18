"""UMC: the page sitemap's grade curricular pages and the units each page lists (WordPress HTML)."""

import html as entities
import re
from types import SimpleNamespace

from engine import curricula
from engine.html_table import rows

INEP_CODE = 521  # Universidade de Mogi das Cruzes's CO_IES in the INEP census

GRADE_URL = re.compile(r"<loc>(https://www\.umc\.br/grade-curricular-([a-z0-9-]+)/)</loc>")
TITLE = re.compile(r"<title>([^<]+?) - Matriz Curricular</title>")
SEDE = re.compile(r"Campus\s+SEDE\s+-\s+([^<]+)<")
# UC types as the page names them: UCF formação geral, UCA de área, UCP profissionalizantes, PFC projeto final de curso.
# CC (componente curricular) is left out: the page says its hours are spread over the whole course, so it is no subject.
UNIT_TYPES = ("UCF", "UCA", "UCP", "PFC")


def parse_sitemap(doc):
    """Return (grade url, label) for every grade curricular page in the page sitemap."""
    pages = GRADE_URL.findall(doc.read().decode("utf-8"))
    if not pages:
        raise ValueError("no grade curricular page in the sitemap")
    return [(url, f"UMC, grade curricular: {slug}") for url, slug in pages]


def load_sitemap(conn, source_id, pages):
    """Register each grade curricular page as a source of umc_curriculum."""
    return sum(
        conn.execute(
            """insert into sources (adapter, url, label) values (%s, %s, %s)
               on conflict (url) do update set label = excluded.label where sources.label is distinct from excluded.label""",
            ("umc_curriculum", url, label),
        ).rowcount
        for url, label in pages
    )


def parse_curriculum(doc):
    """Return (course name, city, subjects): UMC publishes unit names only, no term, year, hours or elective flag."""
    html = doc.read().decode("utf-8")
    title, sede = TITLE.search(html), SEDE.search(html)
    if not title or not sede:
        raise ValueError("no course title or campus sede on the grade curricular page")
    # shortcut: the page names no campus per course, so the course is staged at the sede city its footer publishes;
    # take the city per course once UMC publishes it.
    city = " ".join(entities.unescape(sede[1]).split())
    subjects = [(None, None, row[1][0], None, None) for row in rows(html) if len(row) == 2 and row[0][0] in UNIT_TYPES]
    if not subjects:
        raise ValueError("no unit found on the grade curricular page")
    return " ".join(entities.unescape(title[1]).split()), city, subjects


def load_curriculum(conn, source_id, parsed):
    """Stage the page's course, then its subjects."""
    name, city, subjects = parsed
    written = conn.execute(
        """insert into staging.curriculum_courses (source_id, institution_inep_code, name, city) values (%s, %s, %s, %s)
           on conflict (source_id, city) do update
             set institution_inep_code = excluded.institution_inep_code, name = excluded.name, city = excluded.city
             where (curriculum_courses.institution_inep_code, curriculum_courses.name, curriculum_courses.city)
               is distinct from (excluded.institution_inep_code, excluded.name, excluded.city)""",
        (source_id, INEP_CODE, name, city),
    ).rowcount
    return written + curricula.load_subjects(conn, source_id, subjects)


courses = SimpleNamespace(parse=parse_sitemap, load=load_sitemap)
curriculum = SimpleNamespace(parse=parse_curriculum, load=load_curriculum)
