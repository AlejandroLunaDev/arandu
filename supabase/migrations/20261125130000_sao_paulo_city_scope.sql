-- The scope narrows to São Paulo city, with its distance courses (owner, 2026-11-25; ADR-0007). What lies outside the
-- city is deleted and no longer fetched.

-- Distance courses. The census lists each one once per municipality where it has students, with no campus, so a
-- distance course keeps no city. The census load always sets the modality; the default serves hand-made fixtures.
alter table staging.inep_courses add column tp_modalidade_ensino text not null;
alter table public.courses
  add column modality text not null default 'presencial' check (modality in ('presencial', 'a_distancia')),
  alter column city drop not null,
  add constraint courses_city_by_modality check ((modality = 'presencial') = (city is not null));

create or replace function staging.normalize_inep_census(p_source_id bigint)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  changed_institutions integer;
  changed_areas integer;
  changed_professions integer;
  changed_courses integer;
  deleted_courses integer;
  deleted_institutions integer;
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

  -- Degree courses only: entry areas ("Abi -") publish no degree, sequencial courses another level. QT_CURSO cannot
  -- tell them apart any more: distance courses carry 0 at municipality level.
  insert into public.cine_areas (code, name, parent_code)
  select distinct a.code, a.name, a.parent_code
  from staging.inep_courses c
  cross join lateral (values
    (left(c.cine_code, 2), c.no_cine_area_geral, null),
    (left(c.cine_code, 3), c.no_cine_area_especifica, left(c.cine_code, 2)),
    (left(c.cine_code, 4), c.no_cine_area_detalhada, left(c.cine_code, 3))
  ) as a (code, name, parent_code)
  where c.tp_nivel_academico = '1' and c.tp_grau_academico <> ''
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
  where tp_nivel_academico = '1' and tp_grau_academico <> ''
  on conflict (cine_code) do update
    set slug = excluded.slug, name = excluded.name
    where (professions.slug, professions.name) is distinct from (excluded.slug, excluded.name);
  get diagnostics changed_professions = row_count;

  -- The census has no shift, duration or campus name: those stay null (no invented data).
  insert into public.courses (inep_code, institution_id, profession_id, name, degree, modality, city, source_id)
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
      else c.tp_grau_academico
    end,
    case c.tp_modalidade_ensino when '1' then 'presencial' when '2' then 'a_distancia' else c.tp_modalidade_ensino end,
    case when c.tp_modalidade_ensino = '1' then c.no_municipio end,
    p_source_id
  from staging.inep_courses c
  join public.institutions i on i.inep_code = c.co_ies::integer
  join public.professions p on p.cine_code = c.cine_code
  where c.tp_nivel_academico = '1' and c.tp_grau_academico <> ''
  on conflict (inep_code) do update
    set institution_id = excluded.institution_id, profession_id = excluded.profession_id, name = excluded.name,
        degree = excluded.degree, modality = excluded.modality, city = excluded.city, source_id = excluded.source_id
    where (courses.institution_id, courses.profession_id, courses.name, courses.degree, courses.modality, courses.city,
           courses.source_id)
      is distinct from (excluded.institution_id, excluded.profession_id, excluded.name, excluded.degree,
                        excluded.modality, excluded.city, excluded.source_id);
  get diagnostics changed_courses = row_count;

  -- What the staged census no longer holds is out of scope: its courses go with their curricula, then its institutions
  -- with their disciplines. The engine refuses a census under half the last load before it gets here.
  delete from public.courses c
  where not exists (
    select 1 from staging.inep_courses s
    where s.co_curso::bigint = c.inep_code and s.tp_nivel_academico = '1' and s.tp_grau_academico <> ''
  );
  get diagnostics deleted_courses = row_count;

  delete from public.institutions i
  where not exists (select 1 from staging.inep_ies s where s.co_ies::integer = i.inep_code);
  get diagnostics deleted_institutions = row_count;

  return changed_institutions + changed_areas + changed_professions + changed_courses + deleted_courses
    + deleted_institutions;
end $$;
revoke execute on function staging.normalize_inep_census(bigint) from public, anon, authenticated;

-- Sources outside the city are no longer fetched.
-- Curriculum pages the engine registered from a list: the lists register them again, the city's only
-- (curricula.load_courses). Every source is parsed again on the next run anyway.
delete from public.sources
where adapter in (
  'usp_curriculum', 'mackenzie_curriculum', 'fiap_curriculum', 'unifesp_curriculum', 'anima_course',
  'anima_curriculum', 'unip_units', 'unip_curriculum', 'fatec_curriculum'
);

-- Institutions with no unit in the city, and an IFSP adapter that only covers its Salto campus.
delete from public.sources
where adapter like any (array['ufscar\_%', 'ufabc\_%', 'umc\_%', 'ifsp\_%']);

-- USP units outside the city (Piracicaba, Ribeirão Preto, São Carlos, Bauru, Pirassununga, Lorena), by the cities
-- their curricula were staged with on 2026-11-25.
delete from public.sources
where adapter = 'usp_courses'
  and substring(url from 'codcg=(\d+)')::integer in (11, 17, 18, 22, 24, 25, 55, 58, 59, 60, 74, 75, 76, 81, 88, 89, 90,
                                                      97, 98, 99);

-- Fatec units outside the city: the six kept are the units the 2024 census places in São Paulo.
delete from public.sources s
using staging.fatec_documents f
where f.source_id = s.id and s.adapter = 'fatec_media'
  and f.institution_inep_code not in (4026, 15688, 15746, 17942, 17977, 19501);
