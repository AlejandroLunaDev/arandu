begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

-- One USP grade (codcur 88001, codhab 1) with two subjects, one discipline page for it, and a non-grade source.
insert into public.sources (id, adapter, url, label) overriding system value values
  (9901, 't_inst', 'https://example.test/link-inst', 'census'),
  (9902, 'usp_curriculum', 'https://uspdigital.usp.br/jupiterweb/gradeCurricular?codcg=1&codcur=88001&codhab=1&tipo=N', 'grade'),
  (9903, 'usp_discipline', 'https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=TST9&codcur=88001&codhab=1', 'discipline'),
  (9904, 't_page', 'https://example.test/link-other?codcur=88001&codhab=1', 'other');
insert into public.institutions (id, inep_code, name, kind, source_id) overriding system value values (9901, 55, 'Link University', 'public', 9901);
insert into public.courses (id, inep_code, institution_id, name, degree, city, source_id) overriding system value values
  (9911, 990901, 9901, 'Curso Link', 'bacharelado', 'São Paulo', 9901);
insert into public.disciplines (id, institution_id, code, name, source_id) overriding system value values
  (9921, 9901, 'TST9', 'Cálculo I', 9903);
insert into staging.curriculum_courses (source_id, institution_inep_code, name, city) values (9902, 55, 'Curso Link', 'São Paulo');
insert into staging.curriculum_subjects (source_id, term, year, name, hours, is_elective) values
  (9902, 1, 1, 'Cálculo I', 90, false),
  (9902, 1, 1, 'Sem Disciplina', 60, false);

select is(staging.normalize_curriculum(9902), 3, 'normalize stores 2 subjects and links 1');
select is((select discipline_id from public.curriculum_subjects where source_id = 9902 and name = 'Cálculo I'), 9921::bigint, 'the subject matching code and name is linked');
select is((select discipline_id from public.curriculum_subjects where source_id = 9902 and name = 'Sem Disciplina'), null, 'a subject whose name does not match gets no discipline_id');

-- A relink re-inserts the rows without discipline_id: normalize restores it.
delete from public.curriculum_subjects where source_id = 9902;
select is(staging.normalize_curriculum(9902), 3, 'after the rows are deleted, normalize re-inserts them and links again');
select is((select discipline_id from public.curriculum_subjects where source_id = 9902 and name = 'Cálculo I'), 9921::bigint, 'discipline_id is restored');
select is((select discipline_id from public.curriculum_subjects where source_id = 9902 and name = 'Sem Disciplina'), null, 'the non-matching subject is still unlinked');

select is(staging.normalize_curriculum(9902), 0, 'a second normalize changes nothing');

-- Same course, same name, but the source is not a usp_curriculum grade.
insert into public.curriculum_subjects (course_id, year, term, name, source_id) overriding system value values (9911, 2, 1, 'Cálculo I', 9904);
select is(staging.link_disciplines(9904), 0, 'link_disciplines on a non-usp_curriculum source changes 0 rows');
select is((select discipline_id from public.curriculum_subjects where source_id = 9904), null, 'and links nothing');

select * from finish();
rollback;
