"""UNIP: the in-person course list, each course's units (public JSON API) and its course page's grade curricular."""

import json
from types import SimpleNamespace

from engine import curricula
from engine.html_table import rows

API = "https://api.unip.br/sistemas/portal"
INEP_CODE = 322  # Universidade Paulista's CO_IES in the INEP census
UNITS_LABEL = "UNIP, unidades do curso"
PAGE_LABEL = "UNIP, grade curricular"


def parse_courses(doc):
    """Return (slug, course page url, course name) for every in-person course on the ofertados-vigentes list."""
    courses = {}
    for course in json.load(doc)["cursos"]:
        if course["modalidade"].upper() == "PRESENCIAL":  # 'Presencial' for Medicina, 'PRESENCIAL' for the rest
            courses.setdefault(course["urlPaginaCurso"], (course["slugNomeCurso"], course["nomeFormatado"].strip()))
    if not courses:
        raise ValueError("no in-person course found on the course list")
    return [(slug, url, name) for url, (slug, name) in courses.items()]


def load_courses(conn, source_id, courses):
    """Register each course's unit list (unip_units) and course page (unip_curriculum), both labelled with its name."""
    written = 0
    for slug, url, name in courses:
        # 'undefined' coordinates are what the page's 'Ver todas as localidades' sends: every unit, no distance cut.
        for adapter, source_url, label in (
            ("unip_units", f"{API}/localidades/{slug}/undefined/undefined/UnidadesProximaslatlong/1000",
             f"{UNITS_LABEL}: {name}"),
            ("unip_curriculum", url, f"{PAGE_LABEL}: {name}"),
        ):
            written += conn.execute(
                """insert into sources (adapter, url, label) values (%s, %s, %s)
                   on conflict (url) do update set label = excluded.label where sources.label is distinct from excluded.label""",
                (adapter, source_url, label),
            ).rowcount
    return written


def parse_units(doc):
    """Return the distinct cities of the units in SP that offer the course in person, as UNIP publishes them."""
    units = json.load(doc)
    if not units:
        raise ValueError("no unit found for the course")
    # ensino is the course's modalities at that unit: an in-person campus without this course lists only EAD.
    return sorted({u["cidade"] for u in units
                   if u["uf"] == "SP" and "PRESENCIAL" in (m.strip() for m in u["ensino"].split(";"))})


def load_units(conn, source_id, cities):
    """Stage the course page once per city; the page is found by the course name both sources carry."""
    name = conn.execute("select label from sources where id = %s", (source_id,)).fetchone()[0]
    name = name.removeprefix(f"{UNITS_LABEL}: ")
    page = conn.execute(
        "select url from sources where adapter = 'unip_curriculum' and label = %s", (f"{PAGE_LABEL}: {name}",)
    ).fetchone()
    if page is None:
        raise LookupError(f"no unip_curriculum page registered for {name!r}: run unip_courses first")
    return curricula.load_courses(
        conn, "unip_curriculum", INEP_CODE, PAGE_LABEL, [(page[0], name, None, city) for city in cities],
        every_unit=True)  # the page's grade is UNIP's one curriculum for the course at every unit


def parse_curriculum(doc):
    """Return (None, None, name, None, is_elective) for every subject of the in-person grade curricular.

    The grade lists names alphabetically with no term. Its CARGA HORÁRIA column sums to the page's total in
    horas-aula, not clock hours, so hours are left out rather than stored in the wrong unit.
    """
    html = doc.read().decode("utf-8")
    start = html.find('id="pills-gradepresencial"')
    if start < 0:
        raise ValueError("no in-person grade curricular on the course page")
    end = html.find('id="pills-gradeead"', start)
    subjects = [
        (None, None, row[0][0], None, row[0][0].endswith("(Optativa)"))
        for row in rows(html[start:end if end > 0 else None])
        if len(row) == 2 and row[0][0] and row[0][0] != "DISCIPLINAS"
    ]
    if not subjects:
        raise ValueError("no subject found on the grade curricular")
    return subjects


courses = SimpleNamespace(parse=parse_courses, load=load_courses)
units = SimpleNamespace(parse=parse_units, load=load_units)
curriculum = SimpleNamespace(parse=parse_curriculum, load=curricula.load_subjects)
