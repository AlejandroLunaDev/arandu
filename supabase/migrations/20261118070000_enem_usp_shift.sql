-- From the first live load: the census has one row for 'Direito, São Paulo', and ENEM-USP lists its Matutino and
-- Noturno codes (2014/102, 2014/104) separately. Both Júpiter pages link to that one row, so the cut-offs were
-- dropped as ambiguous. Each page states its shift: keep it on the cut-off, which keys on shift already.

drop function staging.normalize_usp_cutoffs(bigint);
drop function staging.usp_cutoff_rows(bigint);

-- The cut-offs of one source that link to exactly one census course, with the shift of the código USP's Júpiter page.
-- A course reached by two codes of the same shift, edition, call and modality is left out.
create function staging.usp_cutoff_rows(p_source_id bigint)
returns table (course_id bigint, shift text, edition_year smallint, call_number smallint, quota_code text, score numeric)
language sql stable set search_path = '' as $$
  with codes as (
    select distinct codcur, codhab from staging.usp_cutoffs where source_id = p_source_id
  ), linked as (
    select k.codcur, k.codhab, cc.shift, l.course_id
    from codes k
    join public.sources s on s.adapter = 'usp_curriculum'
      and s.url ~ ('[?&]codcur=' || k.codcur || '&codhab=' || k.codhab || '&')
    join staging.curriculum_courses cc on cc.source_id = s.id
    cross join lateral staging.curriculum_course_ids(cc.source_id, cc.city) as l(course_id)
  ), one_course as (
    select codcur, codhab, min(shift) as shift, min(course_id) as course_id
    from linked
    group by codcur, codhab
    having count(distinct course_id) = 1 and count(distinct shift) <= 1
  )
  select oc.course_id, oc.shift, o.edition_year, o.call_number, o.quota_code, min(o.score)
  from staging.usp_cutoffs o
  join one_course oc using (codcur, codhab)
  where o.source_id = p_source_id
  group by oc.course_id, oc.shift, o.edition_year, o.call_number, o.quota_code
  having count(*) = 1
$$;

-- As before, with the shift.
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
  select r.course_id, 'enem_usp', 'first_call_min', r.edition_year, null, r.call_number, null, r.shift, r.quota_code,
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
      where r.course_id = a.course_id and r.shift is not distinct from a.shift and r.edition_year = a.edition_year
        and r.call_number = a.call_number and r.quota_code = a.quota_code
    );
  get diagnostics touched = row_count;
  changed := changed + touched;

  return changed;
end $$;

revoke execute on function staging.usp_cutoff_rows(bigint) from public, anon, authenticated;
revoke execute on function staging.normalize_usp_cutoffs(bigint) from public, anon, authenticated;
