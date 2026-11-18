"""INEP Censo da Educação Superior microdata: the in-person courses offered in SP and their institutions.

The official ZIP holds `;`-separated Latin-1 CSVs (checked against the 2024 edition, 2026-11-12).
"""

import csv
import io
import re
import zipfile

COURSES_FILE = re.compile(r"MICRODADOS_CADASTRO_CURSOS_\d{4}\.CSV$", re.IGNORECASE)
IES_FILE = re.compile(r"MICRODADOS_ED_SUP_IES_\d{4}\.CSV$", re.IGNORECASE)
COURSE_COLUMNS = (
    "CO_CURSO", "CO_IES", "NO_CURSO", "CO_CINE_ROTULO", "NO_CINE_ROTULO",
    "NO_CINE_AREA_GERAL", "NO_CINE_AREA_ESPECIFICA", "NO_CINE_AREA_DETALHADA",
    "TP_GRAU_ACADEMICO", "TP_NIVEL_ACADEMICO", "QT_CURSO", "NO_MUNICIPIO",
)
IES_COLUMNS = ("CO_IES", "NO_IES", "SG_IES", "TP_CATEGORIA_ADMINISTRATIVA")
MIN_ROWS_RATIO = 0.5  # fewer SP courses than half the last load means the format probably changed


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
            if row["SG_UF"] == "SP" and row["TP_DIMENSAO"] == "1"
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
        raise ValueError(f"the census has {len(courses)} SP courses, the last load had {previous}: check its format")
    conn.execute("truncate staging.inep_ies, staging.inep_courses")
    with conn.cursor() as cur:
        for table, columns, rows in (("inep_ies", IES_COLUMNS, institutions), ("inep_courses", COURSE_COLUMNS, courses)):
            with cur.copy(f"copy staging.{table} ({', '.join(columns).lower()}) from stdin") as copy:
                for row in rows:
                    copy.write_row(row)
    return conn.execute("select staging.normalize_inep_census(%s)", (source_id,)).fetchone()[0]
