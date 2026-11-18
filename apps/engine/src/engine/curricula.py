"""Shared loading for curriculum adapters: course pages found on a list, and the subjects each page publishes."""

MIN_ROWS_RATIO = 0.5  # fewer subjects than half the last load means the page format probably changed


def load_courses(conn, page_adapter, inep_code, label_prefix, courses, every_unit=False):
    """Register each (url, name, shift, city) course page as a source of page_adapter and stage its course.

    The same url may repeat with other cities when one published curriculum serves several units. every_unit is
    only for sources that state one curriculum for all their units: it links to every census course of that name.
    """
    written = 0
    for url, name, shift, city in courses:
        label = f"{label_prefix}: {name}" + (f" ({shift})" if shift else "")
        written += conn.execute(
            """insert into sources (adapter, url, label) values (%s, %s, %s)
               on conflict (url) do update set label = excluded.label where sources.label is distinct from excluded.label""",
            (page_adapter, url, label),
        ).rowcount
        source_id = conn.execute("select id from sources where url = %s", (url,)).fetchone()[0]
        staged = conn.execute(
            """insert into staging.curriculum_courses (source_id, institution_inep_code, name, city, every_unit)
               values (%s, %s, %s, %s, %s)
               on conflict (source_id, city) do update
                 set institution_inep_code = excluded.institution_inep_code, name = excluded.name,
                   every_unit = excluded.every_unit
                 where (curriculum_courses.institution_inep_code, curriculum_courses.name, curriculum_courses.every_unit)
                   is distinct from (excluded.institution_inep_code, excluded.name, excluded.every_unit)""",
            (source_id, inep_code, name, city, every_unit),
        ).rowcount
        written += staged
        if staged:  # the course changed, so its already-staged subjects may link elsewhere now
            written += conn.execute("select staging.normalize_curriculum(%s)", (source_id,)).fetchone()[0]
    return written


def load_subjects(conn, source_id, subjects):
    """Replace one page's staged (term, year, name, hours, is_elective[, term_to]) subjects and normalize them.

    None means the source does not state that field; term_to closes a published term range.
    """
    previous = conn.execute(
        "select count(*) from staging.curriculum_subjects where source_id = %s", (source_id,)
    ).fetchone()[0]
    if len(subjects) < previous * MIN_ROWS_RATIO:
        raise ValueError(f"source {source_id} has {len(subjects)} subjects, the last load had {previous}: check its format")
    conn.execute("delete from staging.curriculum_subjects where source_id = %s", (source_id,))
    with conn.cursor() as cur:
        with cur.copy("copy staging.curriculum_subjects (source_id, term, year, name, hours, is_elective, term_to) from stdin") as copy:
            for subject in subjects:
                copy.write_row((source_id, *subject, None)[:7])  # 5-tuples have no term_to
    return conn.execute("select staging.normalize_curriculum(%s)", (source_id,)).fetchone()[0]
