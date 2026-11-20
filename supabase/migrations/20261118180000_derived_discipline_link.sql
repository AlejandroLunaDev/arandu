-- The subject-to-discipline link is derived from data on every normalize, not from run history: normalize_curriculum
-- re-inserts subject rows (a census relink to another course, a changed term or shift) without discipline_id, and the
-- discipline adapter links only when its own page changes. Each usp_discipline source url names the subject code
-- (sgldis) and the grade it was picked from (codcur, codhab), so that pair is the link rule.
create function staging.link_disciplines(p_source_id bigint) returns integer
language plpgsql
set search_path = ''
as $$
declare
  touched integer;
begin
  update public.curriculum_subjects s set discipline_id = d.id
  from public.sources g, public.sources ds, public.disciplines d, public.institutions i
  where g.id = p_source_id and g.adapter = 'usp_curriculum' and s.source_id = g.id
    and ds.adapter = 'usp_discipline'
    and substring(ds.url from 'codcur=\d+&codhab=\d+') = substring(g.url from 'codcur=\d+&codhab=\d+')
    and i.inep_code = 55 and d.institution_id = i.id and d.code = substring(ds.url from 'sgldis=([A-Z0-9]+)')
    and staging.name_key(s.name) = staging.name_key(d.name)
    and s.discipline_id is distinct from d.id;
  get diagnostics touched = row_count;
  return touched;
end $$;

revoke execute on function staging.link_disciplines(bigint) from public, anon, authenticated;

create or replace function staging.normalize_curriculum(p_source_id bigint) returns integer
language plpgsql
set search_path = ''
as $$
declare
  linked bigint[];
  linked_course_id bigint;
  page_shift text;
  changed integer := 0;
  touched integer;
begin
  select coalesce(array_agg(distinct ids.id), '{}'), min(cc.shift)
  into linked, page_shift
  from staging.curriculum_courses cc
  left join lateral staging.curriculum_course_ids(cc.source_id, cc.city) as ids (id) on true
  where cc.source_id = p_source_id;
  linked := array_remove(linked, null);

  delete from public.curriculum_subjects s
  where s.source_id = p_source_id and not (s.course_id = any (linked));
  get diagnostics touched = row_count;
  changed := changed + touched;

  foreach linked_course_id in array linked loop
    insert into public.curriculum_subjects (course_id, shift, year, term, term_to, name, hours, is_elective, source_id)
    select distinct on (year, term, name)
      linked_course_id, page_shift, year, term, term_to, name, hours, is_elective, p_source_id
    from staging.curriculum_subjects
    where source_id = p_source_id
    order by year, term, name, is_elective   -- listed as mandatory and as elective: mandatory wins
    on conflict (course_id, shift, year, term, name) do update
      set term_to = excluded.term_to, hours = excluded.hours, is_elective = excluded.is_elective,
        source_id = excluded.source_id
      where (curriculum_subjects.term_to, curriculum_subjects.hours, curriculum_subjects.is_elective,
        curriculum_subjects.source_id)
        is distinct from (excluded.term_to, excluded.hours, excluded.is_elective, excluded.source_id);
    get diagnostics touched = row_count;
    changed := changed + touched;

    delete from public.curriculum_subjects s
    where s.course_id = linked_course_id and s.source_id = p_source_id
      and not exists (
        select 1 from staging.curriculum_subjects n
        where n.source_id = p_source_id and n.year is not distinct from s.year and n.term is not distinct from s.term
          and n.name = s.name and s.shift is not distinct from page_shift
      );
    get diagnostics touched = row_count;
    changed := changed + touched;
  end loop;

  changed := changed + staging.link_disciplines(p_source_id);
  return changed;
end $$;
