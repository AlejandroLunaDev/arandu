begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

-- Stage a small census; normalize it below and test the cut-off checks against its courses.
truncate staging.inep_ies, staging.inep_courses;
insert into staging.inep_ies values
  ('7', 'UNIVERSIDADE FEDERAL DE SÃO CARLOS', 'UFSCAR', '1'),
  ('322', 'UNIVERSIDADE PAULISTA', 'UNIP', '4'),
  ('526', 'CENTRO UNIVERSITÁRIO BRAZ CUBAS', '', '5'),
  ('900', 'INSTITUIÇÃO ESPECIAL', 'ESP', '7');
-- co_curso, co_ies, no_curso, co_cine_rotulo, no_cine_rotulo, no_cine_area_geral, no_cine_area_especifica, no_cine_area_detalhada,
-- tp_grau_academico, tp_nivel_academico, qt_curso, no_municipio. INEP publishes the label in literal double quotes (most rows here).
insert into staging.inep_courses (co_curso, co_ies, no_curso, co_cine_rotulo, no_cine_rotulo, no_cine_area_geral, no_cine_area_especifica,
  no_cine_area_detalhada, tp_grau_academico, tp_nivel_academico, qt_curso, no_municipio) values
  ('614', '7', 'Ciência Da Computação', '"0613C01"', 'Ciência da computação', 'Computação e Tecnologias da Informação e Comunicação (TIC)',
    'Computação e Tecnologias da Informação e Comunicação (TIC)', 'Análise e desenvolvimento de algoritmos e aplicações', '1', '1', '1', 'São Carlos'),
  ('621', '7', 'Ciências Biológicas', '"0114B01"', 'Biologia formação de professor', 'Educação', 'Educação',
    'Formação de professores em áreas específicas (exceto Letras)', '2', '1', '1', 'São Carlos'),
  ('7261', '322', 'Informática', '"0681C02"', 'TIC', 'Computação e Tecnologias da Informação e Comunicação (TIC)',
    'Programas interdisciplinares abrangendo computação e Tecnologias da Informação e Comunicação (TIC)', 'Soluções computacionais para domínios específicos', '3', '1', '1', 'São Paulo'),
  ('900003', '526', 'Administração', '"0413A01"', 'Administração', 'Negócios, administração e direito', 'Negócios e administração',
    'Gestão e administração', '4', '1', '1', 'Campinas'),
  ('8000', '7', 'Psicologia', '"0313P01"', 'Psicologia', 'Ciências sociais, comunicação e informação', 'Ciências sociais e comportamentais',
    'Psicologia', '1', '1', '1', 'São Carlos'),
  ('8001', '322', 'Psicologia', '0313P01', 'Psicologia', 'Ciências sociais, comunicação e informação', 'Ciências sociais e comportamentais',
    'Psicologia', '1', '1', '1', 'São Paulo'),
  ('5000589', '7', 'Abi - Matemática', '"0011A05"', 'ABI', 'Programas básicos', 'Programas básicos', 'Programas básicos', '', '1', '0', 'São Carlos'),
  ('800', '7', 'Sequencial', '"0000S00"', 'Sequencial', 'x', 'x', 'x', '1', '2', '1', 'São Carlos');

-- Returns: the rows changed on a first load, 0 on a repeat.
select is(staging.normalize_inep_census((select id from public.sources where adapter = 'inep_census')), 29, 'first load changes 4 institutions + 14 areas + 5 professions + 6 courses');
select is(staging.normalize_inep_census((select id from public.sources where adapter = 'inep_census')), 0, 'second load changes nothing');

select is(
  (select array_agg(kind order by inep_code) from public.institutions where inep_code in (7, 322, 526, 900)),
  array['public', 'private', 'private', 'special'] , 'kind: 1 public, 4/5 private, 7 special');
select is((select short_name from public.institutions where inep_code = 526), null, 'empty acronym becomes null');
select is(
  (select array_agg(degree order by inep_code) from public.courses),
  array['bacharelado', 'licenciatura', 'tecnologico', 'bacharelado', 'bacharelado', 'bacharelado_licenciatura'], 'degree codes 1-4');
select is((select count(*)::int from public.courses where inep_code in (5000589, 800)), 0, 'entry area (QT_CURSO 0) and sequencial (nivel 2) are excluded');

update staging.inep_courses set no_curso = 'Ciência da Computação' where co_curso = '614';
select is(staging.normalize_inep_census((select id from public.sources where adapter = 'inep_census')), 1, 'a changed name changes one row');
select is((select name from public.courses where inep_code = 614), 'Ciência da Computação', 'the name was updated');

update staging.inep_ies set tp_categoria_administrativa = '0' where co_ies = '7';
select throws_ok($$select staging.normalize_inep_census((select id from public.sources where adapter = 'inep_census'))$$,
  '23514', null, 'unknown category code fails the kind check');

-- CINE areas, professions and the course link.
select is(
  (select array_agg(code || '>' || coalesce(parent_code, '-') order by code) from public.cine_areas),
  array['01>-', '011>01', '0114>011', '03>-', '031>03', '0313>031', '04>-', '041>04', '0413>041', '06>-', '061>06', '0613>061', '068>06', '0681>068'],
  'areas at 3 levels with the parent chain');
select is((select name from public.cine_areas where code = '0313'), 'Psicologia', 'area name comes from the staged column');
select is(
  (select array_agg(slug order by cine_code) from public.professions),
  array['biologia-formacao-de-professor', 'psicologia', 'administracao', 'ciencia-da-computacao', 'tic'],
  'slug is the unaccented lowercase label');
select is((select name from public.professions where cine_code = '0114B01'), 'Biologia formação de professor', 'profession name is NO_CINE_ROTULO');
select is((select count(*)::int from public.professions where cine_code like '%"%'), 0, 'the INEP double quotes are stripped from the cine code');
select is(
  (select p.cine_code from public.courses c join public.professions p on p.id = c.profession_id where c.inep_code = 614),
  '0613C01', 'a course from a quoted label links to its profession');
select is(
  (select count(distinct profession_id)::int from public.courses where inep_code in (8000, 8001)), 1,
  'a quoted and an unquoted label of the same code share one profession');

select throws_ok($$insert into public.cine_areas (code, name, parent_code) values ('0999', 'x', '031')$$,
  '23514', null, 'cine_areas tree check rejects a code that does not extend its parent');
select throws_ok($$insert into public.cine_areas (code, name, parent_code) values ('99', 'x', '03')$$,
  '23514', null, 'cine_areas tree check rejects a 2-digit area with a parent');
select is((select relrowsecurity from pg_class where oid = 'public.cine_areas'::regclass), true, 'RLS enabled on cine_areas');

-- Cut-offs.
select throws_ok($$insert into public.admission_cutoffs (course_id, route, metric, edition_year, quota_code, quota_label, score, source_id)
  values ((select id from public.courses where inep_code = 614), 'sisu', 'final_cutoff', 2024, 'AC', 'x', 700, (select id from public.sources limit 1))$$,
  '23514', 'new row for relation "admission_cutoffs" violates check constraint "admission_cutoffs_term_per_semester"', 'sisu cut-off without edition_term');
select throws_ok($$insert into public.admission_cutoffs (course_id, route, metric, edition_year, quota_code, quota_label, score, scholarship, source_id)
  values ((select id from public.courses where inep_code = 614), 'prouni', 'final_cutoff', 2024, 'AC', 'x', 700, 'integral', (select id from public.sources limit 1))$$,
  '23514', 'new row for relation "admission_cutoffs" violates check constraint "admission_cutoffs_term_per_semester"', 'prouni cut-off without edition_term');
select lives_ok($$insert into public.admission_cutoffs (course_id, route, metric, edition_year, call_number, quota_code, quota_label, score, source_id)
  values ((select id from public.courses where inep_code = 614), 'fuvest', 'phase1_min', 2024, 1, 'AC', 'x', 60, (select id from public.sources limit 1))$$,
  'fuvest cut-off without edition_term');

-- Access and seed.
select is(has_schema_privilege('anon', 'staging', 'USAGE'), false, 'anon has no usage on schema staging');
select is((select count(*)::int from public.sources where adapter = 'inep_census'), 1, 'the inep_census source is seeded');

select * from finish();
rollback;
