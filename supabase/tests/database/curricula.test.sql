begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

-- One institution (INEP 55) with census courses, and one staged page per case.
insert into public.sources (id, adapter, url, label) overriding system value values
  (9001, 't_inst', 'https://example.test/inst', 'census'),
  (9101, 't_page', 'https://example.test/cc', 'cc'),
  (9102, 't_page', 'https://example.test/mat', 'mat'),
  (9103, 't_page', 'https://example.test/fis-lic', 'fis-lic'),
  (9104, 't_page', 'https://example.test/es', 'es'),
  (9105, 't_page', 'https://example.test/psi-bac', 'psi-bac'),
  (9106, 't_page', 'https://example.test/psi-lic', 'psi-lic'),
  (9107, 't_page', 'https://example.test/psi-psi', 'psi-psi'),
  (9108, 't_page', 'https://example.test/med', 'med');
insert into public.institutions (id, inep_code, name, kind, source_id) overriding system value values (9001, 55, 'Test University', 'public', 9001);
insert into public.courses (id, inep_code, institution_id, name, degree, city, source_id) overriding system value values
  (9201, 990001, 9001, 'Ciência Da Computação', 'bacharelado', 'São Paulo', 9001),
  (9202, 990002, 9001, 'Matemática', 'bacharelado', 'São Paulo', 9001),
  (9203, 990003, 9001, 'Matemática', 'bacharelado', 'São Paulo', 9001),
  (9204, 990004, 9001, 'Física', 'bacharelado', 'São Paulo', 9001),
  (9205, 990005, 9001, 'Engenharia de Software', 'bacharelado', 'São Paulo', 9001),
  (9206, 990006, 9001, 'Psicologia', 'bacharelado', 'São Paulo', 9001),
  (9207, 990007, 9001, 'Psicologia', 'licenciatura', 'São Paulo', 9001),
  (9208, 990008, 9001, 'Psicologia - Formação De Psicólogo', 'bacharelado', 'São Paulo', 9001),
  (9209, 990009, 9001, 'Medicina', 'bacharelado', 'São Paulo', 9001);
insert into staging.curriculum_courses (source_id, institution_inep_code, name, city) values
  (9101, 55, 'Bacharelado em Ciência da Computação', 'São Paulo'),
  (9102, 55, 'Bacharelado em Matemática', 'São Paulo'),
  (9103, 55, 'Licenciatura em Física', 'São Paulo'),
  (9104, 55, 'Engenharia de Software', 'São Paulo'),
  (9105, 55, 'Psicologia - Bacharelado', 'São Paulo'),
  (9106, 55, 'Psicologia - Licenciatura', 'São Paulo'),
  (9107, 55, 'Psicologia - Psicólogo', 'São Paulo'),
  (9108, 55, 'Medicina', 'São Paulo');
-- 'Algoritmos' is listed as mandatory (60 h) and as elective (120 h) in the same term.
insert into staging.curriculum_subjects (source_id, term, year, name, hours, is_elective) values
  (9101, 1, 1, 'Cálculo I', 90, false),
  (9101, 1, 1, 'Introdução', 60, false),
  (9101, 2, 1, 'Algoritmos', 60, false),
  (9101, 2, 1, 'Algoritmos', 120, true),
  (9101, 2, 1, 'Optativa X', null, true),
  (9102, 1, 1, 'Cálculo I', 90, false),
  (9104, null, 1, 'Web Development', null, false);  -- FIAP publishes years, not terms or hours

select is(staging.curriculum_course_id(9101), 9201::bigint, 'a unique institution + city + name match links, ignoring case, accents and the Bacharelado prefix');
select is(staging.curriculum_course_id(9102), null, 'two census courses with the same name and city stay unlinked');
select is(staging.curriculum_course_id(9103), null, 'Licenciatura em Física does not link to a bacharelado Física');
select is((select array_agg(source_id order by source_id) from staging.unlinked_curricula), array[9102::bigint, 9103, 9107], 'unlinked_curricula lists the ambiguous, wrong-degree and unnamed-degree pages only');

select is(staging.normalize_curriculum(9101), 4, 'normalize returns the subject count (5 staged, one listed twice)');
select is(staging.normalize_curriculum(9101), 0, 'a second normalize changes nothing');
select is((select count(*)::int from public.curriculum_subjects where course_id = 9201), 4, 'four subjects in the linked course');
select is(
  (select array_agg(is_elective::text || ':' || hours::int) from public.curriculum_subjects where course_id = 9201 and name = 'Algoritmos'),
  array['false:60'], 'a subject staged as mandatory and elective lands once, as mandatory');

delete from staging.curriculum_subjects where source_id = 9101 and name = 'Optativa X';
select is(staging.normalize_curriculum(9101), 1, 'a subject no longer staged is deleted and counted');
select is((select count(*)::int from public.curriculum_subjects where name = 'Optativa X'), 0, 'the removed subject is gone');

select is(staging.normalize_curriculum(9102), 0, 'an unlinked page normalizes to 0');
select is((select count(*)::int from public.curriculum_subjects where source_id = 9102), 0, 'an unlinked page writes nothing');

select is(has_schema_privilege('anon', 'staging', 'USAGE'), false, 'anon has no usage on schema staging');
select is(has_function_privilege('anon', 'staging.normalize_curriculum(bigint)', 'EXECUTE'), false, 'anon cannot execute normalize_curriculum');
select is((select count(*)::int from public.sources where adapter = 'usp_courses'), 47, 'one usp_courses source per USP unit is seeded');
select ok(exists (select 1 from public.sources where url = 'https://uspdigital.usp.br/jupiterweb/jupCursoLista?codcg=45&tipo=N'), 'IME (codcg=45) is among the usp_courses sources');

select is(staging.normalize_curriculum(9104), 1, 'a year-only subject (term null) normalizes');
select is(staging.normalize_curriculum(9104), 0, 'a second normalize of the year-only page changes nothing');
select is((select count(*)::int from public.curriculum_subjects where course_id = 9205 and term is null and year = 1), 1, 'the year-only subject is stored with a null term');

select is((select count(*)::int from public.sources where adapter = 'mackenzie_courses'), 1, 'the mackenzie_courses source is seeded');
select is((select count(*)::int from public.sources where adapter = 'fiap_courses'), 1, 'the fiap_courses source is seeded');

select is(staging.curriculum_course_id(9105), 9206::bigint, 'X - Bacharelado links to the bacharelado census course X');
select is(staging.curriculum_course_id(9106), 9207::bigint, 'X - Licenciatura links to the licenciatura census course X');
select is(staging.curriculum_course_id(9107), null, 'X - Psicólogo stays unlinked');
select is(staging.curriculum_course_id(9108), 9209::bigint, 'a name with no degree links when it is unique');

select * from finish();
rollback;
