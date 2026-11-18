-- Plan step 4 (USP cut-offs). ENEM-USP's 'Pontos Finais e Classificações Mínimas' PDFs on fuvest.br give, per course
-- and modality, the final score of the last candidate called in a chamada. Each block names its 'código USP'
-- (codcur/codhab), the same pair as the course's Júpiter curriculum page, so the score links to the census course
-- that page links to. Fuvest's own per-call lists name no code and no shift, so they are not loaded.

-- One row per published modality score, as the PDF gives it.
create table staging.usp_cutoffs (
  source_id bigint not null references public.sources (id),
  codcur integer not null,
  codhab integer not null,
  edition_year smallint not null,
  call_number smallint not null,
  quota_code text not null,          -- 'AC', 'EP-L1', 'PPI-L2', 'EP-L3', 'PPI-L4'
  score numeric(6, 2) not null
);
create index usp_cutoffs_source_id_idx on staging.usp_cutoffs (source_id);
alter table staging.usp_cutoffs enable row level security;

-- The cut-offs of one source that link to exactly one census course: its código USP names one Júpiter page, and that
-- page links to one course. A course reached by two codes in the same edition, call and modality is left out.
create function staging.usp_cutoff_rows(p_source_id bigint)
returns table (course_id bigint, edition_year smallint, call_number smallint, quota_code text, score numeric)
language sql stable set search_path = '' as $$
  with codes as (
    select distinct codcur, codhab from staging.usp_cutoffs where source_id = p_source_id
  ), linked as (
    select k.codcur, k.codhab, l.course_id
    from codes k
    join public.sources s on s.adapter = 'usp_curriculum'
      and s.url ~ ('[?&]codcur=' || k.codcur || '&codhab=' || k.codhab || '&')
    join staging.curriculum_courses cc on cc.source_id = s.id
    cross join lateral staging.curriculum_course_ids(cc.source_id, cc.city) as l(course_id)
  ), one_course as (
    select codcur, codhab, min(course_id) as course_id
    from linked
    group by codcur, codhab
    having count(distinct course_id) = 1
  )
  select oc.course_id, o.edition_year, o.call_number, o.quota_code, min(o.score)
  from staging.usp_cutoffs o
  join one_course oc using (codcur, codhab)
  where o.source_id = p_source_id
  group by oc.course_id, o.edition_year, o.call_number, o.quota_code
  having count(*) = 1
$$;

-- Loads one ENEM-USP source into admission_cutoffs. Returns the rows changed.
create function staging.normalize_usp_cutoffs(p_source_id bigint) returns integer
language plpgsql
set search_path = ''
as $$
declare
  changed integer := 0;
  touched integer;
begin
  insert into public.admission_cutoffs (course_id, route, metric, edition_year, edition_term, call_number,
    scholarship, shift, quota_code, quota_label, score, source_id)
  select r.course_id, 'enem_usp', 'first_call_min', r.edition_year, null, r.call_number, null, null, r.quota_code,
    r.quota_code, r.score, p_source_id
  from staging.usp_cutoff_rows(p_source_id) r
  on conflict (course_id, route, metric, edition_year, edition_term, call_number, scholarship, shift, quota_code)
  do update set quota_label = excluded.quota_label, score = excluded.score, source_id = excluded.source_id
    where (admission_cutoffs.quota_label, admission_cutoffs.score, admission_cutoffs.source_id)
      is distinct from (excluded.quota_label, excluded.score, excluded.source_id);
  get diagnostics touched = row_count;
  changed := changed + touched;

  delete from public.admission_cutoffs a
  where a.source_id = p_source_id
    and not exists (
      select 1 from staging.usp_cutoff_rows(p_source_id) r
      where r.course_id = a.course_id and r.edition_year = a.edition_year and r.call_number = a.call_number
        and r.quota_code = a.quota_code
    );
  get diagnostics touched = row_count;
  changed := changed + touched;

  return changed;
end $$;

revoke execute on function staging.usp_cutoff_rows(bigint) from public, anon, authenticated;
revoke execute on function staging.normalize_usp_cutoffs(bigint) from public, anon, authenticated;

-- The 1ª chamada of each published edition; Fuvest names an edition by its admission year.
insert into public.sources (adapter, url, label) values
  ('enem_usp', 'https://www.fuvest.br/wp-content/uploads/enem_usp_2024_notas_minimas_classificacao_aprovado_chamada_1.pdf',
   'Fuvest, ENEM-USP 2024: pontos finais mínimos da 1ª chamada'),
  ('enem_usp', 'https://www.fuvest.br/wp-content/uploads/enem_usp_2025_notas_minimas_aprovado_chamada_1.pdf',
   'Fuvest, ENEM-USP 2025: pontos finais mínimos da 1ª chamada'),
  ('enem_usp', 'https://www.fuvest.br/wp-content/uploads/enem_usp_2026_notas_minimas_classificacao_aprovado_chamada_1.pdf',
   'Fuvest, ENEM-USP 2026: pontos finais mínimos da 1ª chamada')
on conflict (url) do nothing;
