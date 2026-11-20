-- Unifesp's Guarulhos degrees (História, Filosofia, Ciências Sociais, bacharelado and licenciatura) are entered through
-- an ABI course, 'Área Básica de Ingresso': the first termos are the ABI's, and only the ABI course publishes their
-- offers, so the degree's own matriz page stores no ementa. A subject of a Unifesp page with no discipline of its own
-- now links to the discipline of the same name on the ABI page of the same city and shift ('ABI HISTÓRIA' for
-- 'HISTÓRIA - BACHARELADO'), whether the degree page or the ABI page is the one being normalized: the run reads
-- sources in no set order, and an ABI that publishes a new ementa must reach degrees whose own pages did not change.
-- The other branches are unchanged.

create or replace function staging.link_disciplines(p_source_id bigint) returns integer
language plpgsql
set search_path = ''
as $$
declare
  touched integer;
  described integer;
  shared integer;
  entered integer;
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

  -- Run for the degree page or for its ABI page: an ABI that gains an ementa links the degrees that wait for it.
  update public.curriculum_subjects s set discipline_id = d.id
  from public.sources g, staging.curriculum_courses me, staging.curriculum_courses abi, public.disciplines d
  where g.id = s.source_id and g.adapter = 'unifesp_curriculum' and s.discipline_id is null
    and p_source_id in (me.source_id, abi.source_id)
    and me.source_id = g.id and abi.institution_inep_code = me.institution_inep_code
    and staging.name_key(abi.city) = staging.name_key(me.city) and abi.shift is not distinct from me.shift
    and staging.name_key(abi.name)
      = 'abi ' || staging.name_key(regexp_replace(me.name, ' - (?:BACHARELADO|LICENCIATURA)$', ''))
    and d.source_id = abi.source_id and staging.name_key(s.name) = staging.name_key(d.name);
  get diagnostics entered = row_count;

  update public.curriculum_subjects s set discipline_id = d.id
  from public.sources g, public.courses c, public.disciplines d, public.sources ds
  where g.id = p_source_id and g.adapter = 'anima_curriculum' and s.source_id = g.id
    and c.id = s.course_id and d.institution_id = c.institution_id
    and ds.id = d.source_id and ds.adapter = 'anima_ementas'
    and staging.name_key(s.name) = staging.name_key(d.name)
    and s.discipline_id is distinct from d.id;
  get diagnostics shared = row_count;
  return touched + described + shared + entered;
end $$;

revoke execute on function staging.link_disciplines(bigint) from public, anon, authenticated;

-- Link the Guarulhos degrees' subjects already loaded, whose ABI ementas are already stored.
select staging.link_disciplines(g.id) from public.sources g where g.adapter = 'unifesp_curriculum';

-- The reader now turns an accent typed as a spacing ´ ('filoso´ficas') into the accented vowel. A source is parsed
-- only when its digest changes, so the hashes are cleared: the next unifesp_curriculum run re-reads every grade.
update public.sources set last_content_hash = null
where adapter = 'unifesp_curriculum' and last_content_hash is not null;
