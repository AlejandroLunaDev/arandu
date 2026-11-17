-- Plan step 3.2: curricula, the real subjects a student lives to choose a career (ADR-0004).
-- A list adapter registers each curriculum page as a source and stages its course; a page adapter stages its subjects.

create table staging.curriculum_courses (
  source_id bigint primary key references public.sources (id) on delete cascade,
  institution_inep_code integer not null,
  name text not null,   -- as the institution publishes it, e.g. 'Bacharelado em Ciência da Computação'
  city text not null
);

create table staging.curriculum_subjects (
  source_id bigint not null references staging.curriculum_courses (source_id) on delete cascade,
  term smallint check (term between 1 and 14),   -- null when the source groups by year only
  year smallint not null check (year between 1 and 7),
  name text not null,
  hours numeric(6, 1) check (hours > 0),
  is_elective boolean not null
);
create index curriculum_subjects_source_id_idx on staging.curriculum_subjects (source_id);

-- Lowercase, unaccented, single-spaced: the form names are compared in.
create function staging.name_key(p_name text) returns text
language sql immutable set search_path = '' as $$
  select trim(regexp_replace(lower(extensions.unaccent('extensions.unaccent', p_name)), '\s+', ' ', 'g'))
$$;

-- The census course of one staged page: same institution, city, degree (when the page names it) and name.
-- Only a unique match links; anything else stays unlinked, because a guessed link would be invented data.
create function staging.curriculum_course_id(p_source_id bigint) returns bigint
language sql stable set search_path = '' as $$
  with page as (
    select
      cc.institution_inep_code,
      staging.name_key(cc.city) as city,
      substring(staging.name_key(cc.name) from '^(bacharelado|licenciatura) em ') as degree,
      regexp_replace(staging.name_key(cc.name), '^(bacharelado|licenciatura) em ', '') as name
    from staging.curriculum_courses cc
    where cc.source_id = p_source_id
  ), matches as (
    select c.id
    from page p
    join public.institutions i on i.inep_code = p.institution_inep_code
    join public.courses c on c.institution_id = i.id
      and staging.name_key(c.city) = p.city
      and staging.name_key(c.name) = p.name
      and (p.degree is null or c.degree = p.degree)
  )
  select id from matches where (select count(*) from matches) = 1
$$;

-- Pages whose course could not be linked: the list to review by hand, with evidence.
create view staging.unlinked_curricula as
  select cc.*, s.url
  from staging.curriculum_courses cc
  join public.sources s on s.id = cc.source_id
  where staging.curriculum_course_id(cc.source_id) is null;

-- Upserts one page's staged subjects into its linked course and returns the rows changed.
create function staging.normalize_curriculum(p_source_id bigint) returns integer
language plpgsql
set search_path = ''
as $$
declare
  linked_course_id bigint := staging.curriculum_course_id(p_source_id);
  changed integer;
  removed integer;
begin
  if linked_course_id is null then
    return 0;
  end if;

  insert into public.curriculum_subjects (course_id, year, term, name, hours, is_elective, source_id)
  select distinct on (year, term, name) linked_course_id, year, term, name, hours, is_elective, p_source_id
  from staging.curriculum_subjects
  where source_id = p_source_id
  order by year, term, name, is_elective   -- listed as mandatory and as elective: mandatory wins
  on conflict (course_id, year, term, name) do update
    set hours = excluded.hours, is_elective = excluded.is_elective, source_id = excluded.source_id
    where (curriculum_subjects.hours, curriculum_subjects.is_elective, curriculum_subjects.source_id)
      is distinct from (excluded.hours, excluded.is_elective, excluded.source_id);
  get diagnostics changed = row_count;

  delete from public.curriculum_subjects s
  where s.course_id = linked_course_id and s.source_id = p_source_id
    and not exists (
      select 1 from staging.curriculum_subjects n
      where n.source_id = p_source_id and n.year = s.year and n.term is not distinct from s.term and n.name = s.name
    );
  get diagnostics removed = row_count;

  return changed + removed;
end $$;

revoke execute on function staging.name_key(text) from public, anon, authenticated;
revoke execute on function staging.curriculum_course_id(bigint) from public, anon, authenticated;
revoke execute on function staging.normalize_curriculum(bigint) from public, anon, authenticated;

-- shortcut: only IME's course list is registered; other USP units need their codcg codes, which JupiterWeb
-- lists only through its JavaScript (DWR) API. Add their list pages here once those codes are fetched.
insert into public.sources (adapter, url, label, refresh_interval) values (
  'usp_courses',
  'https://uspdigital.usp.br/jupiterweb/jupCursoLista?codcg=45&tipo=N',
  'USP JupiterWeb, cursos do IME',
  interval '1 year'
);

insert into public.sources (adapter, url, label, refresh_interval) values (
  'mackenzie_courses',
  'https://www.mackenzie.br/graduacao',
  'Mackenzie, cursos de graduação',
  interval '1 year'
);

insert into public.sources (adapter, url, label, refresh_interval) values (
  'fiap_courses',
  'https://www.fiap.com.br/graduacao/',
  'FIAP, cursos de graduação',
  interval '1 year'
);
