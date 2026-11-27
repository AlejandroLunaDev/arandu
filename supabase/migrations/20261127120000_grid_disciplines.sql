-- #157: each career plays its own grid's disciplines (owner, 2026-11-27; ADR-0008). Grouping a subject by name made one
-- discipline win for every career (Psicologia played Medicina Veterinária's MAE0110 instead of its own MAE0116), so
-- the name is now the last resort. The discipline a curriculum row plays is, in order:
-- 1. the one its grid links (curriculum_subjects.discipline_id), when it has topics;
-- 2. else one of the same name at the grid's own institution, with topics: one that claimed a name, then one with its
--    first chapter made (no new generation), then the oldest;
-- 3. else the one that claimed the name (public.subjects), as before.
-- Each institution's pick is worked out once, not per row: 85 ms for career_grids against 1.8 s per row (2026-11-27).
create view public.grid_disciplines as
with by_institution as (
  select distinct on (d.subject_key, d.institution_id) d.subject_key, d.institution_id, d.id
  from public.disciplines d
  where cardinality(d.topics) > 0 and d.subject_key <> ''
  order by d.subject_key, d.institution_id,
    exists (select 1 from public.subjects su where su.discipline_id = d.id) desc,
    exists (select 1 from public.chapter_contents m where m.discipline_id = d.id and m.topic = 0) desc,
    d.id
)
select cs.id as curriculum_subject_id,
  coalesce(case when cardinality(own.topics) > 0 then own.id end, bi.id, su.discipline_id) as discipline_id
from public.curriculum_subjects cs
join public.courses c on c.id = cs.course_id
left join public.disciplines own on own.id = cs.discipline_id
left join by_institution bi on bi.subject_key = cs.subject_key and bi.institution_id = c.institution_id
left join public.subjects su on su.key = cs.subject_key
where cs.subject_key <> '';

revoke all on public.grid_disciplines from anon, authenticated;

-- The same grid choice as 20261125213000, counting a subject as having topics when the discipline it plays has them.
create or replace view public.career_grids as
with grids as (
  select c.profession_id, cs.source_id,
    count(distinct cs.subject_key) as subjects,
    count(distinct cs.subject_key) filter (where exists (
      select 1 from public.grid_disciplines gd join public.disciplines d on d.id = gd.discipline_id
      where gd.curriculum_subject_id = cs.id and cardinality(d.topics) > 0)) as with_topics
  from public.curriculum_subjects cs
  join public.courses c on c.id = cs.course_id
  join public.sources s on s.id = cs.source_id and s.last_fetched_at is not null
  where (cs.term = 1 or (cs.term is null and cs.year = 1)) and cs.is_elective is not true
  group by c.profession_id, cs.source_id
)
select distinct on (profession_id) profession_id, source_id
from grids
order by profession_id, (with_topics = subjects and subjects >= 4) desc, with_topics desc, subjects desc, source_id;

revoke all on public.career_grids from anon, authenticated;
