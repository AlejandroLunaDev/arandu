-- Mackenzie's matriz page links its ementas, and mackenzie_curriculum stores each first-etapa ementa as a discipline of
-- that same page (source), as fiap_curriculum does with FIAP's descriptions. Both link by the page plus the name: a
-- subject row links to the discipline of its own source with the same name. USP's rule is unchanged.
create or replace function staging.link_disciplines(p_source_id bigint) returns integer
language plpgsql
set search_path = ''
as $$
declare
  touched integer;
  described integer;
begin
  update public.curriculum_subjects s set discipline_id = d.id
  from public.sources g, public.sources ds, public.disciplines d, public.institutions i
  where g.id = p_source_id and g.adapter = 'usp_curriculum' and s.source_id = g.id
    and ds.adapter = 'usp_discipline'
    and substring(ds.url from 'codcur=\d+&codhab=\d+') = substring(g.url from 'codcur=\d+&codhab=\d+')
    and i.inep_code = 55 and d.institution_id = i.id and d.code = substring(ds.url from 'sgldis=([A-Z0-9]+)')
    and staging.name_key(s.name) = staging.name_key(d.name)
    and s.discipline_id is distinct from d.id;
  get diagnostics touched = row_count;

  update public.curriculum_subjects s set discipline_id = d.id
  from public.sources g, public.disciplines d
  where g.id = p_source_id and g.adapter in ('fiap_curriculum', 'mackenzie_curriculum') and s.source_id = g.id
    and d.source_id = g.id and staging.name_key(s.name) = staging.name_key(d.name)
    and s.discipline_id is distinct from d.id;
  get diagnostics described = row_count;
  return touched + described;
end $$;

revoke execute on function staging.link_disciplines(bigint) from public, anon, authenticated;
-- No hash reset: the engine now hashes each Mackenzie page together with its ementa PDFs, so every page reads as
-- changed on the next mackenzie_curriculum run.
