begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

-- An ABI page (9952) stores the ementas; the degree pages 9953 (NOTURNO) and 9954 (VESPERTINO) store none of their own.
insert into public.sources (id, adapter, url, label) overriding system value values
  (9951, 't_inst', 'https://example.test/abi-inst', 'census'),
  (9952, 'unifesp_curriculum', 'https://example.test/graduacao/curso/matriz-curricular/abi/detalhes', 'abi'),
  (9953, 'unifesp_curriculum', 'https://example.test/graduacao/curso/matriz-curricular/hist-n/detalhes', 'degree noturno'),
  (9954, 'unifesp_curriculum', 'https://example.test/graduacao/curso/matriz-curricular/hist-v/detalhes', 'degree vespertino');
insert into public.institutions (id, inep_code, name, kind, source_id) overriding system value values (9951, 9990592, 'Unifesp Abi', 'public', 9951);
insert into public.courses (id, inep_code, institution_id, name, degree, city, source_id) overriding system value values
  (9961, 990921, 9951, 'Curso A', 'bacharelado', 'Guarulhos', 9951),
  (9962, 990922, 9951, 'Curso B', 'licenciatura', 'Guarulhos', 9951);
insert into staging.curriculum_courses (source_id, institution_inep_code, name, city, shift) values
  (9952, 9990592, 'ABI HISTÓRIA', 'GUARULHOS', 'NOTURNO'),
  (9953, 9990592, 'HISTÓRIA - BACHARELADO', 'GUARULHOS', 'NOTURNO'),
  (9954, 9990592, 'HISTÓRIA - LICENCIATURA', 'GUARULHOS', 'VESPERTINO');
insert into public.disciplines (id, institution_id, code, name, topics, source_id) overriding system value values
  (9971, 9951, 'abi#HIS', '[HIS] HISTÓRIA DO BRASIL I', array['a'], 9952),
  (9972, 9951, 'own#Prática', 'Prática', array['p'], 9953);
insert into public.curriculum_subjects (course_id, year, name, source_id, discipline_id) values
  (9961, 1, '[HIS] HISTÓRIA DO BRASIL I', 9953, null),
  (9961, 1, 'Prática', 9953, 9972),
  (9961, 1, 'Fora do ABI', 9953, null),
  (9962, 1, '[HIS] HISTÓRIA DO BRASIL I', 9954, null);

select is(staging.link_disciplines(9953), 1, 'the degree page links its one subject found on the ABI page');
select is((select discipline_id from public.curriculum_subjects where source_id = 9953 and name like '[HIS]%'), 9971::bigint, 'to the ABI discipline of the same name');
select is((select discipline_id from public.curriculum_subjects where source_id = 9953 and name = 'Prática'), 9972::bigint, 'a subject already linked to its own page''s discipline keeps that link');
select is((select discipline_id from public.curriculum_subjects where source_id = 9953 and name = 'Fora do ABI'), null, 'a subject not on the ABI page stays unlinked');
select is(staging.link_disciplines(9954), 0, 'a degree page of another shift links nothing');
select is((select discipline_id from public.curriculum_subjects where source_id = 9954), null, 'to the NOTURNO ABI discipline');

-- Another adapter's source never takes the rule.
update public.sources set adapter = 't_page' where id = 9953;
update public.curriculum_subjects set discipline_id = null where source_id = 9953;
select is(staging.link_disciplines(9953), 0, 'a source of another adapter links nothing');
select is((select count(*) from public.curriculum_subjects where source_id = 9953 and discipline_id is not null), 0::bigint, 'and stays unlinked');

select * from finish();
rollback;
