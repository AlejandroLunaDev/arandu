"""INEP Censo da Educação Superior microdata: the courses of São Paulo city, in person and at a distance, and their institutions.

The official ZIP holds `;`-separated Latin-1 CSVs (checked against the 2024 edition, 2026-11-12).
"""

import csv
import io
import re
import zipfile

from engine import fetch

COURSES_FILE = re.compile(r"MICRODADOS_CADASTRO_CURSOS_\d{4}\.CSV$", re.IGNORECASE)
IES_FILE = re.compile(r"MICRODADOS_ED_SUP_IES_\d{4}\.CSV$", re.IGNORECASE)
COURSE_COLUMNS = (
    "CO_CURSO", "CO_IES", "NO_CURSO", "CO_CINE_ROTULO", "NO_CINE_ROTULO",
    "NO_CINE_AREA_GERAL", "NO_CINE_AREA_ESPECIFICA", "NO_CINE_AREA_DETALHADA",
    "TP_GRAU_ACADEMICO", "TP_NIVEL_ACADEMICO", "QT_CURSO", "NO_MUNICIPIO", "TP_MODALIDADE_ENSINO",
)
IES_COLUMNS = ("CO_IES", "NO_IES", "SG_IES", "TP_CATEGORIA_ADMINISTRATIVA")
CITY = ("SP", "São Paulo")  # the scope is São Paulo city only (owner, 2026-11-25)
# TP_DIMENSAO: 1 in-person courses, 2 distance courses, one row per municipality where they have students.
DIMENSIONS = ("1", "2")
download = fetch.download_direct  # a 450 MB official ZIP: too large for the scraper
MIN_ROWS_RATIO = 0.5  # fewer city courses than half the last load means the format probably changed


def _rows(archive, pattern, columns):
    names = [name for name in archive.namelist() if pattern.search(name)]
    if len(names) != 1:
        raise ValueError(f"expected one file matching {pattern.pattern}, found {names}")
    with archive.open(names[0]) as raw:
        reader = csv.DictReader(io.TextIOWrapper(raw, encoding="latin-1", newline=""), delimiter=";")
        missing = set(columns) - set(reader.fieldnames or ())
        if missing:
            raise ValueError(f"{names[0]} lacks columns {sorted(missing)}")
        yield from reader


def parse(doc):
    """Return (institutions, courses) from the census ZIP: tuples of raw strings in IES_COLUMNS / COURSE_COLUMNS order."""
    with zipfile.ZipFile(doc) as archive:
        courses = [
            tuple(row[c] for c in COURSE_COLUMNS)
            for row in _rows(archive, COURSES_FILE, COURSE_COLUMNS + ("SG_UF", "TP_DIMENSAO"))
            if (row["SG_UF"], row["NO_MUNICIPIO"]) == CITY and row["TP_DIMENSAO"] in DIMENSIONS
        ]
        wanted = {course[1] for course in courses}
        institutions = [
            tuple(row[c] for c in IES_COLUMNS)
            for row in _rows(archive, IES_FILE, IES_COLUMNS)
            if row["CO_IES"] in wanted
        ]
    missing = wanted - {institution[0] for institution in institutions}
    if missing:
        raise ValueError(f"courses reference institutions missing from the IES file: {sorted(missing)[:10]}")
    return institutions, courses


def load(conn, source_id, parsed):
    """Replace the staged census with parsed, normalize it into the catalog and return the rows changed."""
    institutions, courses = parsed
    previous = conn.execute("select count(*) from staging.inep_courses").fetchone()[0]
    if len(courses) < previous * MIN_ROWS_RATIO:
        raise ValueError(f"the census has {len(courses)} city courses, the last load had {previous}: check its format")
    conn.execute("truncate staging.inep_ies, staging.inep_courses")
    with conn.cursor() as cur:
        for table, columns, rows in (("inep_ies", IES_COLUMNS, institutions), ("inep_courses", COURSE_COLUMNS, courses)):
            with cur.copy(f"copy staging.{table} ({', '.join(columns).lower()}) from stdin") as copy:
                for row in rows:
                    copy.write_row(row)
    changed = conn.execute("select staging.normalize_inep_census(%s)", (source_id,)).fetchone()[0]
    # Curricula link to census courses, so re-link every staged page: unchanged pages are not re-read by their adapter.
    relinked = conn.execute(
        "select coalesce(sum(staging.normalize_curriculum(source_id)), 0)"
        " from (select distinct source_id from staging.curriculum_courses) pages"
    ).fetchone()[0]
    return changed + relinked
