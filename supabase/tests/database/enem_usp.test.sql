begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

-- One institution (INEP 77) and census courses; each Júpiter page is a usp_curriculum source whose url names codcur/codhab.
insert into public.sources (id, adapter, url, label) overriding system value values
  (9701, 't_inst', 'https://example.test/usp-inst', 'census'),
  (9702, 'enem_usp', 'https://example.test/enem_usp_2026.pdf', 'enem usp 2026'),
  (9711, 'usp_curriculum', 'https://example.test/listarGradeCurricular?codcg=11&codcur=11090&codhab=0&tipo=N', 'one course'),
  (9712, 'usp_curriculum', 'https://example.test/listarGradeCurricular?codcg=12&codcur=12012&codhab=0&tipo=N', 'two courses'),
  (9714, 'usp_curriculum', 'https://example.test/listarGradeCurricular?codcg=14&codcur=14031&codhab=04&tipo=N', 'codhab 04'),
  (9715, 'usp_curriculum', 'https://example.test/listarGradeCurricular?codcg=14&codcur=14031&codhab=104&tipo=N', 'codhab 104'),
  (9716, 'usp_curriculum', 'https://example.test/listarGradeCurricular?codcg=14&codcur=214031&codhab=0&tipo=N', 'codcur 214031');
insert into public.institutions (id, inep_code, name, kind, source_id) overriding system value values (9701, 77, 'Test USP', 'public', 9701);
insert into public.courses (id, inep_code, institution_id, name, degree, city, source_id) overriding system value values
  (9801, 770001, 9701, 'Engenharia Civil', 'bacharelado', 'São Paulo', 9701),
  (9802, 770002, 9701, 'Matemática', 'bacharelado', 'Sorocaba', 9701),
  (9803, 770003, 9701, 'Matemática', 'bacharelado', 'Sorocaba', 9701),
  (9804, 770004, 9701, 'Medicina', 'bacharelado', 'São Paulo', 9701),
  (9805, 770005, 9701, 'Direito', 'bacharelado', 'São Paulo', 9701),
  (9806, 770006, 9701, 'Física', 'bacharelado', 'São Paulo', 9701);
insert into staging.curriculum_courses (source_id, institution_inep_code, name, city, every_unit) values
  (9711, 77, 'Engenharia Civil', 'São Paulo', false),  -- links to course 9801 only
  (9712, 77, 'Matemática', 'Sorocaba', true),          -- every_unit: links to both 9802 and 9803
  (9714, 77, 'Medicina', 'São Paulo', false),
  (9715, 77, 'Direito', 'São Paulo', false),
  (9716, 77, 'Física', 'São Paulo', false);

insert into staging.usp_cutoffs (source_id, codcur, codhab, edition_year, call_number, quota_code, score) values
  (9702, 11090, 0, 2026, 1, 'AC', 790.88),
  (9702, 11090, 0, 2026, 1, 'EP-L1', 728.20),
  (9702, 12012, 0, 2026, 1, 'AC', 805.73),   -- its page links to two courses
  (9702, 13013, 0, 2026, 1, 'AC', 700.00),   -- no page
  (9702, 14031, 0, 2026, 1, 'AC', 750.00);   -- only codhab 04, 104 and codcur 214031 pages exist

select is(staging.normalize_usp_cutoffs(9702), 2, 'first run inserts the two cut-offs of the one-course code');
select results_eq(
  $$select course_id, route, metric, edition_year::int, edition_term::int, call_number::int, scholarship, shift, quota_code, quota_label, score, source_id
    from public.admission_cutoffs order by quota_code$$,
  $$values (9801::bigint, 'enem_usp'::text, 'first_call_min'::text, 2026::int, null::int, 1::int, null::text, null::text,
            'AC'::text, 'AC'::text, 790.88::numeric, 9702::bigint),
           (9801, 'enem_usp', 'first_call_min', 2026, null, 1, null, null, 'EP-L1', 'EP-L1', 728.20, 9702)$$,
  'rows carry route, metric, edition, call, quota and score');
select is((select count(*)::int from public.admission_cutoffs where course_id in (9802, 9803)), 0, 'a code whose page links to two courses is skipped');
select is((select count(*)::int from staging.usp_cutoff_rows(9702) where quota_code = 'AC' and score = 700.00), 0, 'a code with no page is skipped');
select is((select count(*)::int from public.admission_cutoffs where score = 750.00), 0, 'codhab 0 matches neither a codhab=04 nor a codhab=104 page, nor codcur 214031');
select is((select count(*)::int from public.admission_cutoffs where course_id in (9804, 9805, 9806)), 0, 'so none of those courses got a cut-off');
select is((select count(*)::int from public.admission_cutoffs), 2, 'two cut-offs in all');

select is(staging.normalize_usp_cutoffs(9702), 0, 're-running changes no rows');

update staging.usp_cutoffs set score = 800.00 where quota_code = 'AC' and codcur = 11090;
select is(staging.normalize_usp_cutoffs(9702), 1, 'a changed score updates exactly its cut-off');
select is((select score from public.admission_cutoffs where quota_code = 'AC'), 800.00, 'with the new score');

delete from staging.usp_cutoffs where quota_code = 'EP-L1';
select is(staging.normalize_usp_cutoffs(9702), 1, 'a row gone from the source deletes exactly its cut-off');
select is((select count(*)::int from public.admission_cutoffs where quota_code = 'EP-L1'), 0, 'the EP-L1 cut-off is gone');
select is((select count(*)::int from public.admission_cutoffs), 1, 'the other stays');

select * from finish();
rollback;
