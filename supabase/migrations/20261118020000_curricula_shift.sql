-- Plan step 3.2, from the first live run: USP publishes 40 courses with one grade per shift, and the grades differ
-- (Administração: 8 semesters integral, 10 noturno). The census has one course and no shift, so each grade is kept
-- under the course with the shift its page states. A null shift means the page does not state one.

alter table staging.curriculum_courses add column shift text;

alter table public.curriculum_subjects add column shift text;
alter table public.curriculum_subjects drop constraint curriculum_subjects_course_id_year_term_name_key;
alter table public.curriculum_subjects
  add constraint curriculum_subjects_course_id_shift_year_term_name_key
  unique nulls not distinct (course_id, shift, year, term, name);

-- As before, but twins must also share the shift: pages of one course in different shifts each link.
create or replace function staging.curriculum_course_ids(p_source_id bigint, p_city text) returns setof bigint
language sql stable set search_path = '' as $$
  with me as (
    select cc.institution_inep_code, staging.name_key(cc.city) as city, staging.name_key(cc.name) as name,
      staging.name_key(coalesce(cc.shift, '')) as shift, cc.every_unit
    from staging.curriculum_courses cc
    where cc.source_id = p_source_id and cc.city = p_city
  ), twins as (
    select other.source_id, staging.curriculum_fingerprint(other.source_id) as fingerprint
    from staging.curriculum_courses other
    join me on other.institution_inep_code = me.institution_inep_code
      and staging.name_key(other.city) = me.city and staging.name_key(other.name) = me.name
      and staging.name_key(coalesce(other.shift, '')) = me.shift
  ), staged as (
    select me.*, (select count(*) from twins) as twin_count
    from me
    where (select count(*) from twins) = 1
      or (p_source_id = (select min(source_id) from twins)
        and (select count(*) from twins where fingerprint is null) = 0
        and (select count(distinct fingerprint) from twins) = 1)
  ), page as (
    select
      institution_inep_code,
      city,
      case
        when name ~ '^bacharelado em ' or name ~ '(?: - | \()bacharel(?:ado)?\)?$' then 'bacharelado'
        when name ~ '^licenciatura em ' or name ~ '(?: - | \()licenciatura\)?$' then 'licenciatura'
        when name ~ '^(?:curso superior de |tecnologia (?:\(em\)|em) )' then 'tecnologico'
      end as degree,
      regexp_replace(
        regexp_replace(name,
          '^(?:bacharelado em |licenciatura em |curso superior de (?:tecnologia (?:\(em\)|em) )?|tecnologia (?:\(em\)|em) )',
          ''),
        '(?: - | \()(?:bacharel(?:ado)?|licenciatura)\)?$', '') as name,
      every_unit,
      twin_count
    from staged
  ), matches as (
    select c.id
    from page p
    join public.institutions i on i.inep_code = p.institution_inep_code
    join public.courses c on c.institution_id = i.id
      and staging.name_key(c.city) = p.city
      and staging.name_key(c.name) = p.name
      and (p.degree is null or c.degree = p.degree)
  )
  select id from matches
  where (select count(*) from matches) = 1
    or (select every_unit from page)
    or ((select twin_count from page) > 1 and (select count(*) from matches) <= (select twin_count from page))
$$;

drop view staging.unlinked_curricula;  -- cc.* now carries shift, which a replace cannot insert
create view staging.unlinked_curricula as
  select cc.*, s.url
  from staging.curriculum_courses cc
  join public.sources s on s.id = cc.source_id
  where not exists (select 1 from staging.curriculum_course_ids(cc.source_id, cc.city))
    and not exists (
      select 1
      from staging.curriculum_courses twin
      where twin.source_id <> cc.source_id and twin.institution_inep_code = cc.institution_inep_code
        and staging.name_key(twin.city) = staging.name_key(cc.city)
        and staging.name_key(twin.name) = staging.name_key(cc.name)
        and staging.name_key(coalesce(twin.shift, '')) = staging.name_key(coalesce(cc.shift, ''))
        and staging.curriculum_fingerprint(twin.source_id) = staging.curriculum_fingerprint(cc.source_id)
        and exists (select 1 from staging.curriculum_course_ids(twin.source_id, twin.city))
    );

-- As before, and every row carries its page's shift.
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

  return changed;
end $$;
