-- A grid only has to reach its career (ADR-0008). A staged grid page now links to every census course of its
-- institution and city that carries its name, instead of only to a single exact course: two shifts against two census
-- courses with no shift, a 'Ciclo Básico' shared by several courses or a name spelled another way no longer leave a
-- fetched grid unused (141 pages on 2026-11-25). Each career then plays the first semester of its best grid.

-- How many leading words two names share: 'matematica aplicada computacional' and 'matematica' share 1.
create function staging.shared_words(p_a text, p_b text) returns integer
language sql immutable set search_path = '' as $$
  select count(*)::integer from (
    select a.w = b.w as same, sum(case when a.w = b.w then 0 else 1 end) over (order by a.n) as breaks
    from unnest(string_to_array(p_a, ' ')) with ordinality as a (w, n)
    join unnest(string_to_array(p_b, ' ')) with ordinality as b (w, n) using (n)
  ) pairs
  where same and breaks = 0
$$;

-- The courses a staged page is the grid of, in order of preference:
-- 1. the courses named like the page;
-- 2. else the courses whose name starts with the page's ('Matemática Aplicada' for each of its habilitações);
-- 3. else the course whose name the page contains, the longest one ('Artes Cênicas - Ciclo Básico' for 'Artes
--    Cênicas'), unless another course of the institution shares more leading words with the page: then the page is
--    a sibling of that one, not of the shorter name ('Matemática Aplicada e Computacional - ...' is not 'Matemática').
-- The page's degree, when it states one, still has to match.
create or replace function staging.curriculum_course_ids(p_source_id bigint, p_city text) returns setof bigint
language sql stable set search_path = '' as $$
  with page as (
    select cc.institution_inep_code, staging.name_key(cc.city) as city,
      case
        when n ~ '^bacharelado em ' or n ~ '(?: - | \()bacharel(?:ado)?\)?(?: - |$)' then 'bacharelado'
        when n ~ '^licenciatura em ' or n ~ '(?: - | \()licenciatura\)?(?: - |$)' then 'licenciatura'
        when n ~ '^(?:curso superior de |tecnologia (?:\(em\)|em) )' or n ~ ' \(tecnologo\)$' then 'tecnologico'
      end as degree,
      staging.loose_key(regexp_replace(regexp_replace(regexp_replace(n,
        '^(?:bacharelado em |licenciatura em |curso superior de (?:tecnologia (?:\(em\)|em) )?|tecnologia (?:\(em\)|em) )',
        ''),
        '(?: - | \()(?:bacharel(?:ado)?|licenciatura|tecnologo)\)?$', ''),
        ' - (?:bacharelado|licenciatura) - ', ' - ')) as k
    from staging.curriculum_courses cc, staging.name_key(cc.name) as n
    where cc.source_id = p_source_id and cc.city = p_city
  ), courses as (
    select c.id, staging.loose_key(c.name) as ck, p.k
    from page p
    join public.institutions i on i.inep_code = p.institution_inep_code
    join public.courses c on c.institution_id = i.id and staging.name_key(c.city) = p.city
      and (p.degree is null or c.degree = p.degree)
  ), ranked as (
    select id, ck, k,
      case when ck = k then 1 when ck like k || ' %' then 2 when ' ' || k || ' ' like '% ' || ck || ' %' then 3 end as tier
    from courses
  ), best as (
    select * from ranked where tier = (select min(tier) from ranked)
  )
  select id from best
  where tier < 3
    or (length(ck) = (select max(length(ck)) from best)
      and not exists (select 1 from courses o
                      where staging.shared_words(o.ck, o.k) > array_length(string_to_array(best.ck, ' '), 1)))
$$;

revoke execute on function staging.shared_words(text, text) from public, anon, authenticated;

-- Re-link every grid already fetched with the rule above.
select staging.normalize_curriculum(source_id) from (select distinct source_id from staging.curriculum_courses) pages;

-- The grid each career plays: of the grids linked to its courses, the one whose first semester has the most subjects
-- with topics, then the most subjects, then the oldest source.
create view public.career_grids as
select distinct on (c.profession_id) c.profession_id, cs.source_id
from public.curriculum_subjects cs
join public.courses c on c.id = cs.course_id
join public.sources s on s.id = cs.source_id and s.last_fetched_at is not null
where cs.term = 1 or (cs.term is null and cs.year = 1)
group by c.profession_id, cs.source_id
order by c.profession_id,
  count(distinct cs.subject_key) filter (where exists (
    select 1 from public.subjects su join public.disciplines d on d.id = su.discipline_id
    where su.key = cs.subject_key and cardinality(d.topics) > 0)) desc,
  count(distinct cs.subject_key) desc,
  cs.source_id;

revoke all on public.career_grids from anon, authenticated;
