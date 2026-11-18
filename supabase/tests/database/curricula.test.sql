begin;
create extension if not exists pgtap with schema extensions;
select plan(71);

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

select is((select array_agg(id order by id) from staging.curriculum_course_ids(9101, 'São Paulo') as t(id)), array[9201::bigint], 'a unique institution + city + name match links, ignoring case, accents and the Bacharelado prefix');
select is((select array_agg(id order by id) from staging.curriculum_course_ids(9102, 'São Paulo') as t(id)), null, 'two census courses with the same name and city stay unlinked');
select is((select array_agg(id order by id) from staging.curriculum_course_ids(9103, 'São Paulo') as t(id)), null, 'Licenciatura em Física does not link to a bacharelado Física');
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

select is((select array_agg(id order by id) from staging.curriculum_course_ids(9105, 'São Paulo') as t(id)), array[9206::bigint], 'X - Bacharelado links to the bacharelado census course X');
select is((select array_agg(id order by id) from staging.curriculum_course_ids(9106, 'São Paulo') as t(id)), array[9207::bigint], 'X - Licenciatura links to the licenciatura census course X');
select is((select array_agg(id order by id) from staging.curriculum_course_ids(9107, 'São Paulo') as t(id)), null, 'X - Psicólogo stays unlinked');
select is((select array_agg(id order by id) from staging.curriculum_course_ids(9108, 'São Paulo') as t(id)), array[9209::bigint], 'a name with no degree links when it is unique');

-- Pages added after the original cases (their unlinked pages must not disturb the unlinked_curricula check above).
insert into public.sources (id, adapter, url, label) overriding system value values
  (9110, 't_page', 'https://example.test/ads', 'ads, one grade for every unit'),
  (9111, 't_page', 'https://example.test/adm', 'adm, no every_unit'),
  (9112, 't_page', 'https://example.test/ped', 'ped, two cities'),
  (9113, 't_page', 'https://example.test/rad', 'rad'),
  (9114, 't_page', 'https://example.test/enf', 'enf'),
  (9115, 't_page', 'https://example.test/cb', 'cb'),
  (9116, 't_page', 'https://example.test/oft', 'oft'),
  (9117, 't_page', 'https://example.test/design-a', 'design a'),
  (9118, 't_page', 'https://example.test/design-b', 'design b');
insert into public.courses (id, inep_code, institution_id, name, degree, city, source_id) overriding system value values
  -- UNIP style: the census repeats one course name once per campus, with no campus field.
  (9210, 990010, 9001, 'Análise E Desenvolvimento De Sistemas', 'tecnologico', 'Campinas', 9001),
  (9211, 990011, 9001, 'Análise E Desenvolvimento De Sistemas', 'tecnologico', 'Campinas', 9001),
  (9212, 990012, 9001, 'Análise E Desenvolvimento De Sistemas', 'tecnologico', 'Campinas', 9001),
  (9213, 990013, 9001, 'Análise E Desenvolvimento De Sistemas', 'tecnologico', 'Sorocaba', 9001),
  (9214, 990014, 9001, 'Administração', 'bacharelado', 'Santos', 9001),
  (9215, 990015, 9001, 'Administração', 'bacharelado', 'Santos', 9001),
  (9216, 990016, 9001, 'Pedagogia', 'licenciatura', 'São Paulo', 9001),
  (9217, 990017, 9001, 'Pedagogia', 'licenciatura', 'Guarulhos', 9001),
  (9218, 990018, 9001, 'Radiologia', 'tecnologico', 'São Paulo', 9001),
  (9219, 990019, 9001, 'Radiologia', 'bacharelado', 'São Paulo', 9001),
  (9220, 990020, 9001, 'Enfermagem', 'bacharelado', 'São Paulo', 9001),
  (9221, 990021, 9001, 'Enfermagem', 'licenciatura', 'São Paulo', 9001),
  (9222, 990022, 9001, 'Ciências Biológicas', 'licenciatura', 'São Paulo', 9001),
  (9223, 990023, 9001, 'Ciências Biológicas', 'bacharelado', 'São Paulo', 9001),
  (9224, 990024, 9001, 'Tecnologia Oftálmica', 'tecnologico', 'São Paulo', 9001),
  (9225, 990025, 9001, 'Design Educacional', 'tecnologico', 'São Paulo', 9001);
insert into staging.curriculum_courses (source_id, institution_inep_code, name, city, every_unit) values
  (9110, 55, 'Análise e Desenvolvimento de Sistemas', 'Campinas', true),
  (9110, 55, 'Análise e Desenvolvimento de Sistemas', 'Sorocaba', true),
  (9111, 55, 'Administração', 'Santos', false),
  (9112, 55, 'Licenciatura em Pedagogia', 'São Paulo', false),
  (9112, 55, 'Licenciatura em Pedagogia', 'Guarulhos', false),
  (9113, 55, 'CURSO SUPERIOR DE TECNOLOGIA (EM) RADIOLOGIA', 'São Paulo', false),
  (9114, 55, 'ENFERMAGEM - BACHAREL', 'São Paulo', false),
  (9115, 55, 'Ciências Biológicas (Licenciatura)', 'São Paulo', false),
  (9116, 55, 'CURSO SUPERIOR DE TECNOLOGIA OFTÁLMICA', 'São Paulo', false),
  (9117, 55, 'CURSO SUPERIOR DE TECNOLOGIA EM DESIGN EDUCACIONAL', 'São Paulo', false),
  (9118, 55, 'Curso Superior de Tecnologia em Design Educacional', 'são paulo', false);
insert into staging.curriculum_subjects (source_id, term, year, name, hours, is_elective, term_to) values
  (9110, null, null, 'Análise e Projetos de Sistemas', null, false, null),
  (9110, null, null, 'Desenvolvimento Mobile (Optativa)', null, true, null),
  (9111, null, null, 'Contabilidade', null, null, null),
  (9112, 1, null, 'Componente A', 160, null, 3),   -- Ânima: 'Semestres 1 - 3', no year, no elective flag
  (9112, null, 2, 'Componente B', null, true, null);

select is((select array_agg(id order by id) from staging.curriculum_course_ids(9110, 'Campinas') as t(id)), array[9210::bigint, 9211, 9212], 'every_unit links to all three same-name census rows of the city');
select is((select array_agg(id order by id) from staging.curriculum_course_ids(9110, 'Sorocaba') as t(id)), array[9213::bigint], 'the same every_unit source links its other city too');
select is(staging.normalize_curriculum(9110), 8, 'every_unit loads the 2 subjects into each of the 4 linked courses');
select is((select count(distinct course_id)::int from public.curriculum_subjects where source_id = 9110), 4, 'the subjects landed in four different courses');
select is(staging.normalize_curriculum(9110), 0, 'a second normalize of the every_unit page changes nothing');

select is((select count(*)::int from staging.curriculum_course_ids(9111, 'Santos') as t(id)), 0, 'without every_unit, two same-name census rows stay unlinked');
select is((select array_agg(source_id order by source_id) from staging.unlinked_curricula where source_id in (9111, 9117, 9118)), array[9111::bigint, 9117, 9118], 'unlinked_curricula lists the ambiguous page and both duplicate pages');
select is(staging.normalize_curriculum(9111), 0, 'an unlinked page with staged subjects loads nothing');

select is((select array_agg(id) from staging.curriculum_course_ids(9112, 'São Paulo') as t(id)), array[9216::bigint], 'one source staged in two cities links the São Paulo course');
select is((select array_agg(id) from staging.curriculum_course_ids(9112, 'Guarulhos') as t(id)), array[9217::bigint], 'and the Guarulhos course');
select is(staging.normalize_curriculum(9112), 4, 'its 2 subjects load into both cities courses');
select is((select array_agg(c order by course_id) from (select course_id, count(*)::int as c from public.curriculum_subjects where source_id = 9112 group by course_id) x), array[2, 2], 'each city course has both subjects');

select is((select array_agg(id) from staging.curriculum_course_ids(9113, 'São Paulo') as t(id)), array[9218::bigint], 'CURSO SUPERIOR DE TECNOLOGIA (EM) RADIOLOGIA links to the tecnologico course, not the bacharelado');
select is((select array_agg(id) from staging.curriculum_course_ids(9114, 'São Paulo') as t(id)), array[9220::bigint], 'ENFERMAGEM - BACHAREL links to the bacharelado course, not the licenciatura');
select is((select array_agg(id) from staging.curriculum_course_ids(9115, 'São Paulo') as t(id)), array[9222::bigint], 'Ciências Biológicas (Licenciatura) links to the licenciatura course');
select is((select array_agg(id) from staging.curriculum_course_ids(9116, 'São Paulo') as t(id)), array[9224::bigint], 'CURSO SUPERIOR DE TECNOLOGIA OFTÁLMICA keeps Tecnologia in the name and links as tecnologico');
select is((select count(*)::int from staging.curriculum_course_ids(9117, 'São Paulo') as t(id)), 0, 'two pages with the same institution, city and name leave the first unlinked');
select is((select count(*)::int from staging.curriculum_course_ids(9118, 'são paulo') as t(id)), 0, 'and the second, comparing city and name ignoring case');

select is((select term_to::int from public.curriculum_subjects where course_id = 9216 and name = 'Componente A'), 3, 'term_to round-trips');
select ok((select year is null and is_elective is null and hours = 160 from public.curriculum_subjects where course_id = 9216 and name = 'Componente A'), 'a null year and null is_elective round-trip');
select is(staging.normalize_curriculum(9112), 0, 'a second normalize of the round-trip page returns 0');

select is(
  (select string_agg(adapter || ':' || n, ',' order by adapter) from (
     select adapter, count(*) as n from public.sources
     where adapter in ('anima_sitemap', 'unip_courses', 'ufabc_courses', 'ufabc_curriculum', 'ifsp_courses', 'ufscar_courses', 'umc_courses', 'unifesp_courses')
     group by adapter) s),
  'anima_sitemap:2,ifsp_courses:2,ufabc_courses:1,ufabc_curriculum:1,ufscar_courses:1,umc_courses:1,unifesp_courses:7,unip_courses:1',
  'the new adapters seed their sources');
select throws_ok(
  $$insert into staging.curriculum_courses (source_id, institution_inep_code, name, city) values (9110, 55, 'X', 'Campinas')$$,
  '23505', null, 'a source cannot stage the same city twice');

-- A page staged under a wrong name stays unlinked with its subjects staged; re-staging the right name and normalizing links them.
insert into public.sources (id, adapter, url, label) overriding system value values (9120, 't_page', 'https://example.test/eng-civil', 'eng civil');
insert into public.courses (id, inep_code, institution_id, name, degree, city, source_id) overriding system value values
  (9226, 990026, 9001, 'Engenharia Civil', 'bacharelado', 'São Paulo', 9001);
insert into staging.curriculum_courses (source_id, institution_inep_code, name, city) values (9120, 55, 'Habilitação: Engenharia Civil', 'São Paulo');
insert into staging.curriculum_subjects (source_id, term, year, name, hours, is_elective) values (9120, 1, 1, 'Cálculo A', 90, false), (9120, 1, 1, 'Física A', 60, false);

select is(staging.normalize_curriculum(9120), 0, 'a page staged under a wrong name links nothing');
select is((select count(*)::int from staging.curriculum_subjects where source_id = 9120), 2, 'and keeps its subjects staged');
update staging.curriculum_courses set name = 'Engenharia Civil' where source_id = 9120;
select is(staging.normalize_curriculum(9120), 2, 're-staged with the right name, the same normalize links both subjects');
select is((select count(*)::int from public.curriculum_subjects where course_id = 9226), 2, 'they land in the census course');

-- Twins: staged pages with the same institution, city and name. One city and one name per case.
insert into public.sources (id, adapter, url, label) overriding system value
select n, 't_page', 'https://example.test/twin-' || n, 'twin ' || n from generate_series(9131, 9142) n;
insert into public.courses (id, inep_code, institution_id, name, degree, city, source_id) overriding system value values
  (9231, 990031, 9001, 'Curso Gemeo Um', 'bacharelado', 'Cidade Um', 9001),
  (9232, 990032, 9001, 'Curso Gemeo Dois', 'bacharelado', 'Cidade Dois', 9001),
  (9233, 990033, 9001, 'Curso Gemeo Dois', 'bacharelado', 'Cidade Dois', 9001),
  (9234, 990034, 9001, 'Curso Gemeo Tres', 'bacharelado', 'Cidade Tres', 9001),
  (9235, 990035, 9001, 'Curso Gemeo Quatro', 'bacharelado', 'Cidade Quatro', 9001),
  (9236, 990036, 9001, 'Curso Gemeo Cinco', 'bacharelado', 'Cidade Cinco', 9001),
  (9237, 990037, 9001, 'Curso Gemeo Cinco', 'bacharelado', 'Cidade Cinco', 9001),
  (9238, 990038, 9001, 'Curso Gemeo Cinco', 'bacharelado', 'Cidade Cinco', 9001),
  (9239, 990039, 9001, 'Curso Gemeo Seis', 'bacharelado', 'Cidade Seis', 9001);
insert into staging.curriculum_courses (source_id, institution_inep_code, name, city) values
  (9131, 55, 'Curso Gemeo Um', 'Cidade Um'), (9132, 55, 'Curso Gemeo Um', 'Cidade Um'),
  (9133, 55, 'Curso Gemeo Dois', 'Cidade Dois'), (9134, 55, 'Curso Gemeo Dois', 'Cidade Dois'),
  (9135, 55, 'Curso Gemeo Tres', 'Cidade Tres'), (9136, 55, 'Curso Gemeo Tres', 'Cidade Tres'),
  (9137, 55, 'Curso Gemeo Quatro', 'Cidade Quatro'), (9138, 55, 'Curso Gemeo Quatro', 'Cidade Quatro'),
  (9139, 55, 'Curso Gemeo Cinco', 'Cidade Cinco'), (9140, 55, 'Curso Gemeo Cinco', 'Cidade Cinco'),
  (9141, 55, 'Curso Gemeo Seis', 'Cidade Seis');
insert into staging.curriculum_subjects (source_id, term, year, name, hours, is_elective)
select p, 1, 1, s, 60, false
from (values (9131), (9132), (9133), (9134), (9139), (9140)) pages(p), (values ('Materia A'), ('Materia B')) subj(s);
insert into staging.curriculum_subjects (source_id, term, year, name, hours, is_elective) values
  (9135, 1, 1, 'Materia A', 60, false), (9136, 1, 1, 'Materia Z', 60, false),
  (9137, 1, 1, 'Materia A', 60, false),
  (9141, 1, 1, 'Materia A', 60, false);

select is((select array_agg(id) from staging.curriculum_course_ids(9131, 'Cidade Um') as t(id)), array[9231::bigint], 'identical twins, one census match: the lower source_id links');
select is((select count(*)::int from staging.curriculum_course_ids(9132, 'Cidade Um') as t(id)), 0, 'and the higher one returns none');
select is(staging.normalize_curriculum(9131), 2, 'normalize on the lower twin links its subjects');
select is((select count(*)::int from public.curriculum_subjects where course_id = 9231), 2, 'they land in the census course');
select is((select count(*)::int from staging.unlinked_curricula where source_id in (9131, 9132)), 0, 'neither identical twin is unlinked');

select is((select array_agg(id order by id) from staging.curriculum_course_ids(9133, 'Cidade Dois') as t(id)), array[9232::bigint, 9233], 'identical twins, two census matches: the lower links to both');
select is((select count(*)::int from staging.curriculum_course_ids(9134, 'Cidade Dois') as t(id)), 0, 'and the higher one returns none');
select is(staging.normalize_curriculum(9133), 4, 'normalize on the lower twin loads 2 subjects into each of the 2 courses');
select is((select count(*)::int from staging.unlinked_curricula where source_id in (9133, 9134)), 0, 'neither two-match twin is unlinked');

select is((select count(*)::int from staging.curriculum_course_ids(9135, 'Cidade Tres') as t(id)), 0, 'twins with different subjects: the lower returns none');
select is((select count(*)::int from staging.curriculum_course_ids(9136, 'Cidade Tres') as t(id)), 0, 'and the higher returns none');
select is((select array_agg(source_id order by source_id) from staging.unlinked_curricula where source_id in (9135, 9136)), array[9135::bigint, 9136], 'both differing twins are unlinked');

select is((select count(*)::int from staging.curriculum_course_ids(9137, 'Cidade Quatro') as t(id)), 0, 'twins where one has no subjects: the one with subjects returns none');
select is((select count(*)::int from staging.curriculum_course_ids(9138, 'Cidade Quatro') as t(id)), 0, 'and the one without returns none');

select is((select count(*)::int from staging.curriculum_course_ids(9139, 'Cidade Cinco') as t(id)), 0, 'three census matches, two identical twins: the lower links nothing');
select is((select count(*)::int from staging.curriculum_course_ids(9140, 'Cidade Cinco') as t(id)), 0, 'and the higher links nothing');

select is(staging.normalize_curriculum(9141), 1, 'a single page links and loads its subject');
insert into staging.curriculum_courses (source_id, institution_inep_code, name, city) values (9142, 55, 'Curso Gemeo Seis', 'Cidade Seis');
insert into staging.curriculum_subjects (source_id, term, year, name, hours, is_elective) values (9142, 1, 1, 'Materia Y', 60, false);
select is(staging.normalize_curriculum(9141), 1, 'once a non-identical twin is staged, normalize on the first page removes its subject');
select is((select count(*)::int from public.curriculum_subjects where source_id = 9141), 0, 'and no rows of that page remain');

select * from finish();
rollback;
