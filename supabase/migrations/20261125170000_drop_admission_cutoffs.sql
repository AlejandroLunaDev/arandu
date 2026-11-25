-- The product shows no cut-offs (owner, 2026-11-25): their table and the ENEM-USP lists that only fed it go. MEC's
-- Power BI stays for the one thing it still gives, each course's campus, which Ânima's unit matrices link through.

drop function staging.normalize_usp_cutoffs(bigint);
drop function staging.usp_cutoff_rows(bigint);
drop table staging.usp_cutoffs;
delete from public.scrape_runs where adapter = 'enem_usp';
delete from public.sources where adapter = 'enem_usp';

drop table public.admission_cutoffs;

-- As before, without the cut-offs: the campus of the latest edition that names one; a code with two campuses in that
-- edition is left unknown.
create or replace function staging.normalize_mec(p_source_id bigint) returns integer
language plpgsql
set search_path = ''
as $$
declare
  changed integer;
begin
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
  get diagnostics changed = row_count;
  return changed;
end $$;
