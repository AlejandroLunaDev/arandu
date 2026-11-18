-- Plan step 3.2, from the first live run: USP publishes many courses twice under one name and city (one grade per
-- shift), and the census has no shift. In 80 of USP's 85 such groups the pages publish the same subjects, so they are
-- one curriculum: link it once. Pages whose subjects differ still stay unlinked, because which is which is unknown.

-- One page's subjects as a comparable fingerprint; null when the page staged no subject.
create function staging.curriculum_fingerprint(p_source_id bigint) returns text
language sql stable set search_path = '' as $$
  select md5(string_agg(
    concat_ws('|', coalesce(year::text, ''), coalesce(term::text, ''), coalesce(term_to::text, ''), name,
      coalesce(hours::text, ''), coalesce(is_elective::text, '')),
    E'\n' order by year, term, name, is_elective, hours, term_to))
  from staging.curriculum_subjects
  where source_id = p_source_id
$$;

-- As before, plus twins: staged pages with the same institution, city and name. Identical twins link through the
-- lowest source_id to every matching census course, when there are at least as many twins as matches; otherwise
-- no twin links.
create or replace function staging.curriculum_course_ids(p_source_id bigint, p_city text) returns setof bigint
language sql stable set search_path = '' as $$
  with me as (
    select cc.institution_inep_code, staging.name_key(cc.city) as city, staging.name_key(cc.name) as name, cc.every_unit
    from staging.curriculum_courses cc
    where cc.source_id = p_source_id and cc.city = p_city
  ), twins as (
    select other.source_id, staging.curriculum_fingerprint(other.source_id) as fingerprint
    from staging.curriculum_courses other
    join me on other.institution_inep_code = me.institution_inep_code
      and staging.name_key(other.city) = me.city and staging.name_key(other.name) = me.name
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

-- Unlinked pages, without the identical twins whose curriculum already links through their lowest source_id.
create or replace view staging.unlinked_curricula as
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
        and staging.curriculum_fingerprint(twin.source_id) = staging.curriculum_fingerprint(cc.source_id)
        and exists (select 1 from staging.curriculum_course_ids(twin.source_id, twin.city))
    );

-- As before, and a page that no longer links to a course takes its subjects out of that course.
create or replace function staging.normalize_curriculum(p_source_id bigint) returns integer
language plpgsql
set search_path = ''
as $$
declare
  linked bigint[];
  linked_course_id bigint;
  changed integer := 0;
  touched integer;
begin
  select coalesce(array_agg(distinct ids.id), '{}')
  into linked
  from staging.curriculum_courses cc
  cross join lateral staging.curriculum_course_ids(cc.source_id, cc.city) as ids (id)
  where cc.source_id = p_source_id;

  delete from public.curriculum_subjects s
  where s.source_id = p_source_id and not (s.course_id = any (linked));
  get diagnostics touched = row_count;
  changed := changed + touched;

  foreach linked_course_id in array linked loop
    insert into public.curriculum_subjects (course_id, year, term, term_to, name, hours, is_elective, source_id)
    select distinct on (year, term, name) linked_course_id, year, term, term_to, name, hours, is_elective, p_source_id
    from staging.curriculum_subjects
    where source_id = p_source_id
    order by year, term, name, is_elective   -- listed as mandatory and as elective: mandatory wins
    on conflict (course_id, year, term, name) do update
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
          and n.name = s.name
      );
    get diagnostics touched = row_count;
    changed := changed + touched;
  end loop;

  return changed;
end $$;

revoke execute on function staging.curriculum_fingerprint(bigint) from public, anon, authenticated;
