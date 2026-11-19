-- unifesp_curriculum now stores each first-termo unit's ementa, read from its conteúdo programático page, as a
-- discipline of the matriz page (source), as fiap_curriculum and mackenzie_curriculum do: a subject row links to the
-- discipline of its own source with the same name. The other branches are unchanged. No hash reset: the engine now
-- hashes each matriz together with its units' pages, so every matriz reads as changed on the next run.
create or replace function staging.link_disciplines(p_source_id bigint) returns integer
language plpgsql
set search_path = ''
as $$
declare
  touched integer;
  described integer;
  shared integer;
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
  where g.id = p_source_id and g.adapter in ('fiap_curriculum', 'mackenzie_curriculum', 'unifesp_curriculum') and s.source_id = g.id
    and d.source_id = g.id and staging.name_key(s.name) = staging.name_key(d.name)
    and s.discipline_id is distinct from d.id;
  get diagnostics described = row_count;

  update public.curriculum_subjects s set discipline_id = d.id
  from public.sources g, public.courses c, public.disciplines d, public.sources ds
  where g.id = p_source_id and g.adapter = 'anima_curriculum' and s.source_id = g.id
    and c.id = s.course_id and d.institution_id = c.institution_id
    and ds.id = d.source_id and ds.adapter = 'anima_ementas'
    and staging.name_key(s.name) = staging.name_key(d.name)
    and s.discipline_id is distinct from d.id;
  get diagnostics shared = row_count;
  return touched + described + shared;
end $$;

revoke execute on function staging.link_disciplines(bigint) from public, anon, authenticated;
