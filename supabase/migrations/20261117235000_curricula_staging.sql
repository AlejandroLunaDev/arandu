-- Plan step 3.2: curricula, the real subjects a student lives to choose a career (ADR-0004).
-- A list adapter registers each curriculum page as a source and stages its course; a page adapter stages its subjects.

-- Sources publish different detail. A null year or is_elective means the source does not state it (UNIP lists only
-- names); term_to closes a published range such as Ânima's 'Semestres 1 - 3' (term = 1, term_to = 3).
alter table public.curriculum_subjects
  alter column year drop not null,
  alter column is_elective drop default,
  alter column is_elective drop not null,
  add column term_to smallint check (term_to between 1 and 14 and term_to > term);

-- One row per city a curriculum page serves: UNIP publishes one grade per course for all its units.
create table staging.curriculum_courses (
  source_id bigint not null references public.sources (id) on delete cascade,
  institution_inep_code integer not null,
  name text not null,   -- as the institution publishes it, e.g. 'Bacharelado em Ciência da Computação'
  city text not null,
  -- The source itself states this curriculum is the same at all its units (UNIP): then it links to every census
  -- course of that name in the city, which the census repeats once per campus with no campus field.
  every_unit boolean not null default false,
  primary key (source_id, city)
);

create table staging.curriculum_subjects (
  source_id bigint not null references public.sources (id) on delete cascade,
  term smallint check (term between 1 and 14),   -- null when the source groups by year only
  year smallint check (year between 1 and 7),     -- null when the source states no year
  name text not null,
  hours numeric(6, 1) check (hours > 0),
  is_elective boolean,                            -- null when the source does not say
  term_to smallint check (term_to between 1 and 14 and term_to > term)
);
create index curriculum_subjects_source_id_idx on staging.curriculum_subjects (source_id);

-- Lowercase, unaccented, single-spaced: the form names are compared in.
create function staging.name_key(p_name text) returns text
language sql immutable set search_path = '' as $$
  select trim(regexp_replace(lower(extensions.unaccent('extensions.unaccent', p_name)), '\s+', ' ', 'g'))
$$;

-- The census course of one staged page in one city: same institution, city, degree (when the page names it) and name.
-- The degree is read only where the page writes it: 'Bacharelado em X', 'X - Bacharelado', 'X - Bacharel',
-- 'X (Bacharelado)', the same for Licenciatura, and 'Tecnologia em X' / 'Curso Superior de [Tecnologia (em)] X'.
-- Two staged pages with the same institution, city and name both stay unlinked: which is which is unknown.
-- Only a unique match links, or every match when the source states one curriculum for all units; anything else
-- stays unlinked, because a guessed link would be invented data.
create function staging.curriculum_course_ids(p_source_id bigint, p_city text) returns setof bigint
language sql stable set search_path = '' as $$
  with staged as (
    select cc.institution_inep_code, staging.name_key(cc.city) as city, staging.name_key(cc.name) as name, cc.every_unit
    from staging.curriculum_courses cc
    where cc.source_id = p_source_id and cc.city = p_city
      and not exists (
        select 1 from staging.curriculum_courses other
        where other.source_id <> cc.source_id and other.institution_inep_code = cc.institution_inep_code
          and staging.name_key(other.city) = staging.name_key(cc.city)
          and staging.name_key(other.name) = staging.name_key(cc.name)
      )
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
      every_unit
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
  select id from matches where (select count(*) from matches) = 1 or (select every_unit from page)
$$;

-- Pages whose course could not be linked: the list to review by hand, with evidence.
create view staging.unlinked_curricula as
  select cc.*, s.url
  from staging.curriculum_courses cc
  join public.sources s on s.id = cc.source_id
  where not exists (select 1 from staging.curriculum_course_ids(cc.source_id, cc.city));

-- Upserts one page's staged subjects into every course it links to (one per city) and returns the rows changed.
create function staging.normalize_curriculum(p_source_id bigint) returns integer
language plpgsql
set search_path = ''
as $$
declare
  linked_course_id bigint;
  changed integer := 0;
  touched integer;
begin
  for linked_course_id in
    select distinct linked.id
    from staging.curriculum_courses cc
    cross join lateral staging.curriculum_course_ids(cc.source_id, cc.city) as linked (id)
    where cc.source_id = p_source_id
  loop
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

revoke execute on function staging.name_key(text) from public, anon, authenticated;
revoke execute on function staging.curriculum_course_ids(bigint, text) from public, anon, authenticated;
revoke execute on function staging.normalize_curriculum(bigint) from public, anon, authenticated;

-- The 47 USP units with entry courses, as JupiterWeb's own DWR method pubListarColegiado returned them on
-- 2026-11-12 (owner's research). shortcut: a unit created later is not picked up; re-read that list yearly.
insert into public.sources (adapter, url, label, refresh_interval)
select 'usp_courses', 'https://uspdigital.usp.br/jupiterweb/jupCursoLista?codcg=' || unit || '&tipo=N',
  'USP JupiterWeb, cursos da unidade ' || unit, interval '1 year'
from unnest(array[1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 17, 18, 21, 22, 23, 24, 25, 27, 39, 41, 42, 43, 44, 45, 46, 47, 48, 55, 58, 59, 60, 66, 74, 75, 76, 81, 86, 87, 88, 89, 90, 97, 98, 99]) as unit;

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

-- The other curriculum sources, as each institution publishes its course list (owner research 02 and 04).
-- shortcut: IFSP's catalog (www.ifsp.edu.br) answers the engine with a bot challenge, so only the two Salto course
-- pages the research documented are seeded; add other campuses' pages, and their cities in ifsp.CAMPUS_CITY, by hand.
-- shortcut: UFABC's catalog URL names its academic years; re-point it from /catalogos-de-disciplinas each year.
insert into public.sources (adapter, url, label, refresh_interval) values
  ('anima_sitemap', 'https://www.usjt.br/sitemap.xml', 'São Judas, sitemap', interval '1 year'),
  ('anima_sitemap', 'https://portal.anhembi.br/sitemap.xml', 'Anhembi Morumbi, sitemap', interval '1 year'),
  ('unip_courses', 'https://api.unip.br/sistemas/inscricoes/v1/cursos/ofertados-vigentes', 'UNIP, cursos de graduação',
    interval '1 year'),
  ('ufabc_courses', 'https://prograd.ufabc.edu.br/cursos', 'UFABC, cursos de graduação', interval '1 year'),
  ('ufabc_curriculum', 'https://prograd.ufabc.edu.br/pdf/catalogo_disciplinas_graduacao_categorias_2025_2026.xlsx',
    'UFABC, catálogo de disciplinas 2025-2026 por curso', interval '1 year'),
  ('ifsp_courses',
    'https://slt.ifsp.edu.br/index.php/component/content/article/2-uncategorised/509-bacharelado-em-ciencias-da-computacao',
    'IFSP Salto, Bacharelado em Ciência da Computação', interval '1 year'),
  ('ifsp_courses',
    'https://slt.ifsp.edu.br/index.php/component/content/article/2-uncategorised/510-engenharia-de-controle-e-automacao',
    'IFSP Salto, Bacharelado em Engenharia de Controle e Automação', interval '1 year'),
  ('ufscar_courses', 'https://www.prograd.ufscar.br/pt-br/cursos', 'UFSCar, cursos de graduação', interval '1 year'),
  ('umc_courses', 'https://www.umc.br/page-sitemap.xml', 'UMC, grades curriculares (page sitemap)', interval '1 year');

insert into public.sources (adapter, url, label, refresh_interval)
select 'unifesp_courses', 'https://cursos.siiu.unifesp.br/graduacao/campus/' || campus || '/cursos',
  'Unifesp, cursos do campus ' || campus, interval '1 year'
from unnest(array[1, 2, 3, 4, 5, 6, 9]) as campus;
