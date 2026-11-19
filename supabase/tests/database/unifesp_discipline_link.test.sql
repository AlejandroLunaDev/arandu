begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

-- A Unifesp matriz page (source 9902) whose ementas are stored as disciplines of that same page, a same-named
-- discipline of another page, and a subject of the page that no ementa describes.
insert into public.sources (id, adapter, url, label) overriding system value values
  (9901, 't_inst', 'https://example.test/unifesp-inst', 'census'),
  (9902, 'unifesp_curriculum', 'https://example.test/graduacao/curso/matriz-curricular/a/detalhes', 'page a'),
  (9903, 'unifesp_curriculum', 'https://example.test/graduacao/curso/matriz-curricular/b/detalhes', 'page b');
insert into public.institutions (id, inep_code, name, kind, source_id) overriding system value values (9901, 9990591, 'Unifesp Link', 'public', 9901);
insert into public.courses (id, inep_code, institution_id, name, degree, city, source_id) overriding system value values
  (9911, 990913, 9901, 'Curso A', 'bacharelado', 'São Paulo', 9901);
insert into public.disciplines (id, institution_id, code, name, topics, source_id) overriding system value values
  (9921, 9901, 'a#Cálculo', 'Cálculo', array['a'], 9902),
  (9922, 9901, 'b#Cálculo', 'Cálculo', array['b'], 9903);
insert into public.curriculum_subjects (course_id, year, name, source_id) values
  (9911, 1, 'CÁLCULO', 9902), (9911, 1, 'Sem Ementa', 9902), (9911, 1, 'Cálculo', 9903);

select is(staging.link_disciplines(9902), 1, 'the Unifesp page links its one described subject (name_key ignores case)');
select is((select discipline_id from public.curriculum_subjects where source_id = 9902 and name = 'CÁLCULO'), 9921::bigint, 'to the discipline of its own page, not the same-named one of another page');
select is((select discipline_id from public.curriculum_subjects where source_id = 9902 and name = 'Sem Ementa'), null, 'a subject without an ementa stays unlinked');
select is(staging.link_disciplines(9902), 0, 'a second link changes nothing');
select is(staging.link_disciplines(9903), 1, 'the other page links to its own discipline');
select is((select discipline_id from public.curriculum_subjects where source_id = 9903), 9922::bigint, 'the right one');

-- Another adapter's source never takes the rule.
update public.sources set adapter = 't_page' where id = 9903;
update public.curriculum_subjects set discipline_id = null where source_id = 9903;
select is(staging.link_disciplines(9903), 0, 'a source of another adapter links nothing');
select is((select discipline_id from public.curriculum_subjects where source_id = 9903), null, 'and stays unlinked');

select * from finish();
rollback;
