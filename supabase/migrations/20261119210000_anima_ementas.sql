-- São Judas publishes each presencial course's PPC on its documents page, and each 2026 PPC links the course's
-- ementário. anima_ementas stores those ementas as São Judas disciplines (owner, 2026-11-19: a subject's published
-- description is its theme), and an Ânima grade row links to the discipline of its own institution with the same
-- name. Ânima shares units across courses, so one ementa serves every grade that lists that unit.
insert into public.sources (adapter, url, label, refresh_interval) values (
  'anima_ementas',
  'https://www.usjt.br/sobre/documentos-institucionais/',
  'São Judas, ementários dos cursos presenciais',
  interval '1 year'
);

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
  where g.id = p_source_id and g.adapter in ('fiap_curriculum', 'mackenzie_curriculum') and s.source_id = g.id
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
