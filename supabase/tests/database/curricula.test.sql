begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

-- One institution (INEP 55) with census courses, and one staged page per case.
insert into public.sources (id, adapter, url, label) overriding system value values
  (9001, 't_inst', 'https://example.test/inst', 'census'),
  (9101, 't_page', 'https://example.test/cc', 'cc'),
  (9102, 't_page', 'https://example.test/mat', 'mat'),
  (9103, 't_page', 'https://example.test/fis-lic', 'fis-lic');
insert into public.institutions (id, inep_code, name, kind, source_id) overriding system value values (9001, 55, 'Test University', 'public', 9001);
insert into public.courses (id, inep_code, institution_id, name, degree, city, source_id) overriding system value values
  (9201, 990001, 9001, 'Ciência Da Computação', 'bacharelado', 'São Paulo', 9001),
  (9202, 990002, 9001, 'Matemática', 'bacharelado', 'São Paulo', 9001),
  (9203, 990003, 9001, 'Matemática', 'bacharelado', 'São Paulo', 9001),
  (9204, 990004, 9001, 'Física', 'bacharelado', 'São Paulo', 9001);
insert into staging.curriculum_courses (source_id, institution_inep_code, name, city) values
  (9101, 55, 'Bacharelado em Ciência da Computação', 'São Paulo'),
  (9102, 55, 'Bacharelado em Matemática', 'São Paulo'),
  (9103, 55, 'Licenciatura em Física', 'São Paulo');
-- 'Algoritmos' is listed as mandatory (60 h) and as elective (120 h) in the same term.
insert into staging.curriculum_subjects (source_id, term, year, name, hours, is_elective) values
  (9101, 1, 1, 'Cálculo I', 90, false),
  (9101, 1, 1, 'Introdução', 60, false),
  (9101, 2, 1, 'Algoritmos', 60, false),
  (9101, 2, 1, 'Algoritmos', 120, true),
  (9101, 2, 1, 'Optativa X', null, true),
  (9102, 1, 1, 'Cálculo I', 90, false);

select is(staging.curriculum_course_id(9101), 9201::bigint, 'a unique institution + city + name match links, ignoring case, accents and the Bacharelado prefix');
select is(staging.curriculum_course_id(9102), null, 'two census courses with the same name and city stay unlinked');
select is(staging.curriculum_course_id(9103), null, 'Licenciatura em Física does not link to a bacharelado Física');
select is((select array_agg(source_id order by source_id) from staging.unlinked_curricula), array[9102::bigint, 9103], 'unlinked_curricula lists the ambiguous and the wrong-degree pages only');

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
select is((select count(*)::int from public.sources where adapter = 'usp_courses'), 1, 'the usp_courses source is seeded');

select * from finish();
rollback;
