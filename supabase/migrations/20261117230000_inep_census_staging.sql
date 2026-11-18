-- Plan step 3.1: the INEP census adapter (ADR-0004).
-- The engine loads raw census rows into staging; this versioned SQL turns them into institutions and courses.

-- SISU and ProUni run per semester, so their cut-offs need the term.
alter table public.admission_cutoffs
  add constraint admission_cutoffs_term_per_semester check (route not in ('sisu', 'prouni') or edition_term is not null);

-- Professions are INEP's CINE course labels, grouped by CINE's three area levels (owner, 2026-11-17).
-- Codes nest by prefix: area geral '09' > especifica '091' > detalhada '0912' > label '0912M01'.
create extension if not exists unaccent with schema extensions;

create table public.cine_areas (
  code text primary key check (code ~ '^[0-9]{2,4}$'),
  name text not null,
  parent_code text references public.cine_areas (code),
  constraint cine_areas_tree check (
    (length(code) = 2 and parent_code is null) or code = parent_code || right(code, 1)
  )
);
create index cine_areas_parent_code_idx on public.cine_areas (parent_code);
alter table public.cine_areas enable row level security;

alter table public.professions
  add column cine_code text not null unique check (cine_code ~ '^[0-9]{4}[A-Z][0-9]{2}$'),
  add column area_code text generated always as (left(cine_code, 4)) stored references public.cine_areas (code);
create index professions_area_code_idx on public.professions (area_code);

-- The census is the first registered source; it publishes one edition a year.
insert into public.sources (adapter, url, label, refresh_interval) values (
  'inep_census',
  'https://download.inep.gov.br/microdados/microdados_censo_da_educacao_superior_2024.zip',
  'INEP Censo da Educação Superior 2024',
  interval '1 year'
);

-- Staging holds the last load of each source, as published (text, census column names).
-- It is not exposed to the REST API: only the engine reaches it, as the database owner.
create schema staging;
revoke all on schema staging from public, anon, authenticated;

-- One row per institution with an in-person course in SP (MICRODADOS_ED_SUP_IES).
create table staging.inep_ies (
  co_ies text primary key,
  no_ies text not null,
  sg_ies text not null,
  tp_categoria_administrativa text not null
);

-- One row per in-person course offered in SP (MICRODADOS_CADASTRO_CURSOS, TP_DIMENSAO = 1, SG_UF = 'SP').
create table staging.inep_courses (
  co_curso text primary key,
  co_ies text not null,
  no_curso text not null,
  co_cine_rotulo text not null,   -- INEP wraps it in double quotes so spreadsheets keep it as text
  no_cine_rotulo text not null,
  no_cine_area_geral text not null,
  no_cine_area_especifica text not null,
  no_cine_area_detalhada text not null,
  tp_grau_academico text not null,
  tp_nivel_academico text not null,
  qt_curso text not null,
  no_municipio text not null,
  cine_code text generated always as (btrim(co_cine_rotulo, '"')) stored
);

-- Upserts the staged census into the catalog (institutions, CINE areas, professions, courses) and returns the rows it changed.
-- Unchanged rows are skipped, so a second load of the same census writes nothing.
-- Unknown codes are passed through as published and fail the target's check constraint.
create function staging.normalize_inep_census(p_source_id bigint) returns integer
language plpgsql
set search_path = ''
as $$
declare
  changed_institutions integer;
  changed_areas integer;
  changed_professions integer;
  changed_courses integer;
begin
  insert into public.institutions (inep_code, name, short_name, kind, source_id)
  select
    co_ies::integer,
    no_ies,
    nullif(sg_ies, ''),
    case
      when tp_categoria_administrativa in ('1', '2', '3') then 'public'
      when tp_categoria_administrativa in ('4', '5', '6', '8', '9') then 'private'
      when tp_categoria_administrativa = '7' then 'special'
      else tp_categoria_administrativa
    end,
    p_source_id
  from staging.inep_ies
  on conflict (inep_code) do update
    set name = excluded.name, short_name = excluded.short_name, kind = excluded.kind, source_id = excluded.source_id
    where (institutions.name, institutions.short_name, institutions.kind, institutions.source_id)
      is distinct from (excluded.name, excluded.short_name, excluded.kind, excluded.source_id);
  get diagnostics changed_institutions = row_count;

  insert into public.cine_areas (code, name, parent_code)
  select distinct a.code, a.name, a.parent_code
  from staging.inep_courses c
  cross join lateral (values
    (left(c.cine_code, 2), c.no_cine_area_geral, null),
    (left(c.cine_code, 3), c.no_cine_area_especifica, left(c.cine_code, 2)),
    (left(c.cine_code, 4), c.no_cine_area_detalhada, left(c.cine_code, 3))
  ) as a (code, name, parent_code)
  where c.tp_nivel_academico = '1' and c.qt_curso <> '0'
  on conflict (code) do update
    set name = excluded.name, parent_code = excluded.parent_code
    where (cine_areas.name, cine_areas.parent_code) is distinct from (excluded.name, excluded.parent_code);
  get diagnostics changed_areas = row_count;

  insert into public.professions (cine_code, slug, name)
  select distinct
    cine_code,
    trim(both '-' from regexp_replace(lower(extensions.unaccent('extensions.unaccent', no_cine_rotulo)), '[^a-z0-9]+', '-', 'g')),
    no_cine_rotulo
  from staging.inep_courses
  where tp_nivel_academico = '1' and qt_curso <> '0'
  on conflict (cine_code) do update
    set slug = excluded.slug, name = excluded.name
    where (professions.slug, professions.name) is distinct from (excluded.slug, excluded.name);
  get diagnostics changed_professions = row_count;

  -- The census has no shift, duration or campus name: those stay null (no invented data).
  insert into public.courses (inep_code, institution_id, profession_id, name, degree, city, source_id)
  select
    c.co_curso::bigint,
    i.id,
    p.id,
    c.no_curso,
    case c.tp_grau_academico
      when '1' then 'bacharelado'
      when '2' then 'licenciatura'
      when '3' then 'tecnologico'
      when '4' then 'bacharelado_licenciatura'
      else nullif(c.tp_grau_academico, '')
    end,
    c.no_municipio,
    p_source_id
  from staging.inep_courses c
  join public.institutions i on i.inep_code = c.co_ies::integer
  join public.professions p on p.cine_code = c.cine_code
  -- Entry areas ("Abi -", QT_CURSO = 0) and sequencial courses are not degree courses.
  where c.tp_nivel_academico = '1' and c.qt_curso <> '0'
  on conflict (inep_code) do update
    set institution_id = excluded.institution_id, profession_id = excluded.profession_id, name = excluded.name,
        degree = excluded.degree, city = excluded.city, source_id = excluded.source_id
    where (courses.institution_id, courses.profession_id, courses.name, courses.degree, courses.city, courses.source_id)
      is distinct from (excluded.institution_id, excluded.profession_id, excluded.name, excluded.degree, excluded.city,
                        excluded.source_id);
  get diagnostics changed_courses = row_count;

  return changed_institutions + changed_areas + changed_professions + changed_courses;
end $$;
revoke execute on function staging.normalize_inep_census(bigint) from public, anon, authenticated;
