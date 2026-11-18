begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

-- A curriculum page staged before its census course exists: the census load must link it afterwards.
truncate staging.inep_ies, staging.inep_courses;
insert into public.sources (id, adapter, url, label) overriding system value values (9301, 't_page', 'https://example.test/relink', 'relink');
insert into staging.curriculum_courses (source_id, institution_inep_code, name, city) values (9301, 7, 'Ciência da Computação', 'São Carlos');
insert into staging.curriculum_subjects (source_id, term, year, name, hours, is_elective) values
  (9301, 1, 1, 'Cálculo I', 90, false),
  (9301, 1, 1, 'Introdução', 60, false);

select is(staging.normalize_curriculum(9301), 0, 'before the census course exists the page links nothing');
select is((select count(*)::int from public.curriculum_subjects where source_id = 9301), 0, 'so no subject is stored');

insert into staging.inep_ies values ('7', 'UNIVERSIDADE FEDERAL DE SÃO CARLOS', 'UFSCAR', '1');
insert into staging.inep_courses (co_curso, co_ies, no_curso, co_cine_rotulo, no_cine_rotulo, no_cine_area_geral, no_cine_area_especifica,
  no_cine_area_detalhada, tp_grau_academico, tp_nivel_academico, qt_curso, no_municipio) values
  ('614', '7', 'Ciência Da Computação', '"0613C01"', 'Ciência da computação', 'Computação e Tecnologias da Informação e Comunicação (TIC)',
    'Computação e Tecnologias da Informação e Comunicação (TIC)', 'Análise e desenvolvimento de algoritmos e aplicações', '1', '1', '1', 'São Carlos');
select staging.normalize_inep_census((select id from public.sources where adapter = 'inep_census'));

-- The same select inep_census.load runs after normalize_inep_census.
select is(
  (select coalesce(sum(staging.normalize_curriculum(source_id)), 0)::int
   from (select distinct source_id from staging.curriculum_courses) pages),
  2, 'the relink select stores the 2 subjects and returns their count');
select is(
  (select count(*)::int from public.curriculum_subjects s join public.courses c on c.id = s.course_id where c.inep_code = 614),
  2, 'the subjects landed in public.curriculum_subjects under the new census course');

select * from finish();
rollback;
