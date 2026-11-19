"""Shared loading for curriculum adapters: course pages found on a list, and the subjects each page publishes."""

MIN_ROWS_RATIO = 0.5  # fewer subjects than half the last load means the page format probably changed


def load_courses(conn, page_adapter, inep_code, label_prefix, courses, every_unit=False):
    """Register each (url, name, shift, city[, units]) course page as a source of page_adapter and stage its course.

    The same url may repeat with other cities when one published curriculum serves several units. every_unit is
    only for sources that state one curriculum for all their units: it links to every census course of that name.
    units lists the units a page states it serves; it links to their census courses through the MEC campus.
    """
    written = 0
    for url, name, shift, city, *units in courses:
        units = units[0] if units else None
        label = f"{label_prefix}: {name}" + (f" ({shift})" if shift else "")
        written += conn.execute(
            """insert into sources (adapter, url, label) values (%s, %s, %s)
               on conflict (url) do update set label = excluded.label where sources.label is distinct from excluded.label""",
            (page_adapter, url, label),
        ).rowcount
        source_id = conn.execute("select id from sources where url = %s", (url,)).fetchone()[0]
        staged = conn.execute(
            """insert into staging.curriculum_courses (source_id, institution_inep_code, name, city, shift, every_unit, units)
               values (%s, %s, %s, %s, %s, %s, %s)
               on conflict (source_id, city) do update
                 set institution_inep_code = excluded.institution_inep_code, name = excluded.name,
                   shift = excluded.shift, every_unit = excluded.every_unit, units = excluded.units
                 where (curriculum_courses.institution_inep_code, curriculum_courses.name, curriculum_courses.shift,
                   curriculum_courses.every_unit, curriculum_courses.units)
                   is distinct from (excluded.institution_inep_code, excluded.name, excluded.shift, excluded.every_unit,
                   excluded.units)""",
            (source_id, inep_code, name, city, shift, every_unit, units),
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


def load_described(conn, source_id, parsed, inep_code, base):
    """Store a page's (name, description) pairs as disciplines of that page, then load its subjects.

    staging.link_disciplines then links each subject to the discipline of its own page with the same name. The page
    publishes no subject code, and one name can carry another description in another course: the code is the page's
    path plus the name, so each page keeps its own.
    """
    subjects, descriptions = parsed
    url = conn.execute("select url from sources where id = %s", (source_id,)).fetchone()[0]
    path = url.removeprefix(base).strip("/")
    codes = [f"{path}#{name}" for name, _ in descriptions]
    written = conn.execute(
        "delete from public.disciplines where source_id = %s and not (code = any(%s))", (source_id, codes)).rowcount
    for code, (name, description) in zip(codes, descriptions):
        written += conn.execute(
            """insert into public.disciplines (institution_id, code, name, topics, source_id)
               select id, %s, %s, %s, %s from public.institutions where inep_code = %s
               on conflict (institution_id, code) do update
                 set name = excluded.name, topics = excluded.topics, source_id = excluded.source_id
                 where (disciplines.name, disciplines.topics, disciplines.source_id)
                   is distinct from (excluded.name, excluded.topics, excluded.source_id)""",
            (code, name, [description], source_id, inep_code)).rowcount
    return written + load_subjects(conn, source_id, subjects)
