-- Plan step 3 (cut-offs) and the campus link from the live run. MEC's public Power BI behind acessounico.mec.gov.br/busca
-- publishes SISU and ProUni cut-offs per e-MEC course code (the census CO_CURSO), campus and shift. The census has
-- no campus, so these rows also name each course's campus: São Judas' 7 'Administração' codes in São Paulo are
-- Butantã, Mooca, Paulista and so on. Ânima publishes one matrix per unit, which then links to its own census row.

-- A course's campus comes from MEC, not from the census: keep where it came from.
alter table public.courses add column campus_source_id bigint references public.sources (id);
create index courses_campus_source_id_idx on public.courses (campus_source_id);

-- One course code can run cut-offs per shift (ProUni lists MATUTINO and NOTURNO rows for one code).
alter table public.admission_cutoffs add column shift text;
alter table public.admission_cutoffs
  drop constraint admission_cutoffs_unique,
  add constraint admission_cutoffs_unique unique nulls not distinct
    (course_id, route, metric, edition_year, edition_term, call_number, scholarship, shift, quota_code);

-- One row per published Power BI line, as text from the source except the parsed numbers.
create table staging.mec_offers (
  source_id bigint not null references public.sources (id),
  route text not null check (route in ('sisu', 'prouni')),
  course_code bigint not null,
  campus text,
  shift text,
  edition_year smallint not null,
  edition_term smallint not null,
  quota_code text not null,
  quota_label text not null,
  scholarship text check (scholarship in ('integral', 'parcial')),
  score numeric(6, 2)                -- null when the course had no candidates
);
create index mec_offers_source_id_idx on staging.mec_offers (source_id);
create index mec_offers_course_code_idx on staging.mec_offers (course_code);
alter table staging.mec_offers enable row level security;

-- A campus or unit name without its label words: 'Campus Sede Mooca' and 'Mooca' are both 'mooca'.
create function staging.campus_key(p_name text) returns text
language sql immutable set search_path = '' as $$
  select nullif(btrim(regexp_replace(
    regexp_replace(staging.name_key(p_name), '\m(?:campus|unidade|academica|sede|polo|de ensino)\M|[-:,()]', ' ', 'g'),
    '\s+', ' ', 'g')), '')
$$;

-- Units a staged curriculum page states it serves, e.g. {'Butantã'}; null when the page names none.
alter table staging.curriculum_courses add column units text[];

-- As before, plus units: a page that names its units links to every census course of its name whose MEC campus is
-- one of them. Courses with no known campus never link to such a page.
create or replace function staging.curriculum_course_ids(p_source_id bigint, p_city text) returns setof bigint
language sql stable set search_path = '' as $$
  with me as (
    select cc.institution_inep_code, staging.name_key(cc.city) as city, staging.name_key(cc.name) as name,
      staging.name_key(coalesce(cc.shift, '')) as shift, cc.every_unit,
      (select array_agg(staging.campus_key(u)) from unnest(cc.units) as u) as units
    from staging.curriculum_courses cc
    where cc.source_id = p_source_id and cc.city = p_city
  ), twins as (
    select other.source_id, staging.curriculum_fingerprint(other.source_id) as fingerprint
    from staging.curriculum_courses other
    join me on other.institution_inep_code = me.institution_inep_code
      and staging.name_key(other.city) = me.city and staging.name_key(other.name) = me.name
      and staging.name_key(coalesce(other.shift, '')) = me.shift
      and other.units is not distinct from (select cc.units from staging.curriculum_courses cc
                                             where cc.source_id = p_source_id and cc.city = p_city)
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
        when name ~ '^bacharelado em ' or name ~ '(?: - | \()bacharel(?:ado)?\)?(?: - |$)' then 'bacharelado'
        when name ~ '^licenciatura em ' or name ~ '(?: - | \()licenciatura\)?(?: - |$)' then 'licenciatura'
        when name ~ '^(?:curso superior de |tecnologia (?:\(em\)|em) )' or name ~ ' \(tecnologo\)$' then 'tecnologico'
      end as degree,
      regexp_replace(regexp_replace(regexp_replace(name,
        '^(?:bacharelado em |licenciatura em |curso superior de (?:tecnologia (?:\(em\)|em) )?|tecnologia (?:\(em\)|em) )',
        ''),
        '(?: - | \()(?:bacharel(?:ado)?|licenciatura|tecnologo)\)?$', ''),
        ' - (?:bacharelado|licenciatura) - ', ' - ') as name,
      every_unit,
      twin_count,
      units
    from staged
  ), candidates as (
    select c.id, staging.name_key(c.name) = p.name as exact
    from page p
    join public.institutions i on i.inep_code = p.institution_inep_code
    join public.courses c on c.institution_id = i.id
      and staging.name_key(c.city) = p.city
      and staging.loose_key(c.name) = staging.loose_key(p.name)
      and (p.degree is null or c.degree = p.degree)
      and (p.units is null or staging.campus_key(c.campus_name) = any (p.units))
  ), matches as (
    select id from candidates where exact or not exists (select 1 from candidates where exact)
  )
  select id from matches
  where (select count(*) from matches) = 1
    or (select every_unit or units is not null from page)
    or ((select twin_count from page) > 1 and (select count(*) from matches) <= (select twin_count from page))
$$;

-- Loads one Power BI source: each course's campus, then its cut-offs. Returns the rows changed.
create function staging.normalize_mec(p_source_id bigint) returns integer
language plpgsql
set search_path = ''
as $$
declare
  changed integer := 0;
  touched integer;
begin
  -- The campus of the latest edition that names one; a code with two campuses in that edition is left unknown.
  with latest as (
    select distinct on (course_code) course_code, edition_year, edition_term
    from staging.mec_offers
    where staging.campus_key(campus) is not null
    order by course_code, edition_year desc, edition_term desc
  ), named as (
    select o.course_code, min(o.campus) as campus, min(o.source_id) as source_id
    from staging.mec_offers o
    join latest l using (course_code, edition_year, edition_term)
    where staging.campus_key(o.campus) is not null
    group by o.course_code
    having count(distinct staging.campus_key(o.campus)) = 1
  )
  update public.courses c
  set campus_name = n.campus, campus_source_id = n.source_id
  from named n
  where c.inep_code = n.course_code
    and n.course_code in (select course_code from staging.mec_offers where source_id = p_source_id)
    and (c.campus_name, c.campus_source_id) is distinct from (n.campus, n.source_id);
  get diagnostics touched = row_count;
  changed := changed + touched;

  insert into public.admission_cutoffs (course_id, route, metric, edition_year, edition_term, call_number,
    scholarship, shift, quota_code, quota_label, score, source_id)
  -- A key published more than once (SISU 'R' rows of different institutional reserves; semipresencial codes on
  -- several campuses) cannot say which score is which, so it is left out.
  select c.id, min(o.route), 'final_cutoff', o.edition_year, o.edition_term, null::smallint, o.scholarship, o.shift,
    o.quota_code, min(o.quota_label), min(o.score), p_source_id
  from staging.mec_offers o
  join public.courses c on c.inep_code = o.course_code
  where o.source_id = p_source_id and o.score is not null
  group by c.id, o.edition_year, o.edition_term, o.scholarship, o.shift, o.quota_code
  having count(*) = 1
  on conflict (course_id, route, metric, edition_year, edition_term, call_number, scholarship, shift, quota_code)
  do update set quota_label = excluded.quota_label, score = excluded.score, source_id = excluded.source_id
    where (admission_cutoffs.quota_label, admission_cutoffs.score, admission_cutoffs.source_id)
      is distinct from (excluded.quota_label, excluded.score, excluded.source_id);
  get diagnostics touched = row_count;
  changed := changed + touched;

  delete from public.admission_cutoffs a
  where a.source_id = p_source_id
    and (
      select count(*) from staging.mec_offers o
      join public.courses c on c.inep_code = o.course_code
      where o.source_id = p_source_id and o.score is not null and c.id = a.course_id
        and o.edition_year = a.edition_year and o.edition_term = a.edition_term
        and o.scholarship is not distinct from a.scholarship and o.shift is not distinct from a.shift
        and o.quota_code = a.quota_code
    ) <> 1;  -- gone from the source, or now published more than once
  get diagnostics touched = row_count;
  changed := changed + touched;

  return changed;
end $$;

revoke execute on function staging.campus_key(text) from public, anon, authenticated;
revoke execute on function staging.normalize_mec(bigint) from public, anon, authenticated;

-- One source per route and edition, filtered in the query to the demo institutions (product doc §7). The fragment
-- names the edition; the request itself is a POST to the same endpoint.
-- shortcut: SISU stops at 1-2024 and ProUni at 2-2026 because the report holds no later editions; add new ones here
-- when MEC publishes them.
insert into public.sources (adapter, url, label)
select 'mec_powerbi',
  'https://wabi-brazil-south-d-primary-api.analysis.windows.net/public/reports/querydata?synchronous=true#'
    || route || '-' || year || '-' || term,
  'MEC Power BI (acessounico.mec.gov.br/busca), ' || case route when 'sisu' then 'SISU' else 'ProUni' end
    || ' ' || term || '-' || year
from (
  select 'sisu' as route, year, 1 as term from generate_series(2020, 2024) as year  -- second editions hold no SP rows
  union all select 'prouni', year, term from generate_series(2023, 2026) as year, generate_series(1, 2) as term
) editions
on conflict (url) do nothing;
