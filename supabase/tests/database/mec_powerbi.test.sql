begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

-- campus_key drops label words, so MEC's 'Campus Sede Mooca' and a matrix's 'Mooca' agree.
select is(staging.campus_key('Campus Sede Mooca'), staging.campus_key('Mooca'), 'label words do not change the campus key');
select is(staging.campus_key('Campus Butantã'), 'butanta', 'accents and the campus label are dropped');
select is(staging.campus_key('Unidade SEDE'), null, 'a name made only of label words has no key');

insert into public.sources (id, adapter, url, label) overriding system value values
  (9501, 't_inst', 'https://example.test/mec-inst', 'census'),
  (9502, 't_mec', 'https://example.test/mec#sisu-2024-1', 'mec'),
  (9503, 't_page', 'https://example.test/page-butanta', 'butanta'),
  (9504, 't_page', 'https://example.test/page-liberdade', 'liberdade'),
  (9505, 't_page', 'https://example.test/page-two', 'two');
insert into public.institutions (id, inep_code, name, kind, source_id) overriding system value values (9501, 98001, 'MEC Test University', 'private', 9501);
insert into public.courses (id, inep_code, institution_id, name, city, source_id) overriding system value values
  (9601, 880001, 9501, 'Administração', 'São Paulo', 9501),  -- two editions, the latest names Butantã
  (9602, 880003, 9501, 'Administração', 'São Paulo', 9501),  -- two campuses in the latest edition
  (9603, 880004, 9501, 'Administração', 'São Paulo', 9501),  -- only a null score
  (9604, 880005, 9501, 'Administração', 'São Paulo', 9501),  -- one key published twice
  (9605, 880006, 9501, 'Administração', 'São Paulo', 9501),
  (9606, 880007, 9501, 'Administração', 'São Paulo', 9501),
  (9607, 880008, 9501, 'Administração', 'São Paulo', 9501);

insert into staging.mec_offers (source_id, route, course_code, campus, shift, edition_year, edition_term, quota_code, quota_label, scholarship, score) values
  (9502, 'sisu', 880001, 'Campus Sede Mooca', 'noturno', 2023, 1, 'AC', 'AMPLA / AC', null, 650.00),
  (9502, 'sisu', 880001, 'Campus Butantã', 'noturno', 2024, 1, 'AC', 'AMPLA / AC', null, 700.50),
  (9502, 'prouni', 880001, 'Campus Butantã', 'matutino', 2024, 1, 'AMPLA', 'AMPLA', 'integral', 600.00),
  (9502, 'sisu', 880003, 'Campus Paulista', 'matutino', 2024, 1, 'AC', 'AMPLA / AC', null, 510.00),
  (9502, 'sisu', 880003, 'Campus Mooca', 'noturno', 2024, 1, 'AC', 'AMPLA / AC', null, 520.00),
  (9502, 'sisu', 880004, 'Campus Tatuapé', 'noturno', 2024, 1, 'AC', 'AMPLA / AC', null, null),
  (9502, 'sisu', 880005, 'Campus Liberdade', 'noturno', 2024, 1, 'R', 'R', null, 400.00),
  (9502, 'sisu', 880005, 'Campus Liberdade', 'noturno', 2024, 1, 'R', 'R', null, 410.00);

select is(staging.normalize_mec(9502), 8, 'first run: 3 campuses set (not the two-campus course) and 5 cut-offs inserted');

select is((select campus_name from public.courses where id = 9601), 'Campus Butantã', 'the campus comes from the latest edition');
select is((select campus_source_id from public.courses where id = 9601), 9502::bigint, 'and records the source it came from');
select is((select campus_name from public.courses where id = 9602), null, 'two campuses in the latest edition leave it unknown');
select is((select campus_source_id from public.courses where id = 9602), null, 'with no campus source');
select is((select campus_name from public.courses where id = 9604), 'Campus Liberdade', 'a course with one campus gets it');

select is(
  (select count(*)::int from public.admission_cutoffs where course_id = 9601 and edition_year = 2023),
  1, 'an older edition keeps its cut-off');
select results_eq(
  $$select route, shift, scholarship, quota_code, score from public.admission_cutoffs
    where course_id = 9601 and edition_year = 2024 order by route$$,
  $$values ('prouni'::text, 'matutino'::text, 'integral'::text, 'AMPLA'::text, 600.00::numeric),
           ('sisu', 'noturno', null, 'AC', 700.50)$$,
  'cut-offs carry shift and scholarship');
select is(
  (select count(*)::int from public.admission_cutoffs where course_id = 9602),
  2, 'the same quota on two shifts is two cut-offs');
select is((select count(*)::int from public.admission_cutoffs where course_id = 9603), 0, 'a null score is not a cut-off');
select is((select count(*)::int from public.admission_cutoffs where course_id = 9604), 0, 'a key published twice is skipped');
select is((select count(*)::int from public.admission_cutoffs where source_id = 9502), 5, 'five cut-offs in all');

select is(staging.normalize_mec(9502), 0, 're-running changes no rows');

delete from staging.mec_offers where route = 'prouni' and course_code = 880001;
select is(staging.normalize_mec(9502), 1, 'a row gone from the source deletes exactly its cut-off');
select is((select count(*)::int from public.admission_cutoffs where course_id = 9601 and route = 'prouni'), 0, 'the prouni cut-off is gone');
select is((select count(*)::int from public.admission_cutoffs where course_id = 9601), 2, 'the other cut-offs stay');

-- A page that names its units links only to the census courses on those campuses, though seven share its name.
update public.courses set campus_name = v.campus
from (values (9601, 'Campus Butantã'), (9602, 'Campus Paulista'), (9603, 'Campus Mooca'), (9604, 'Campus Tatuapé'),
             (9605, 'Campus Santo Amaro'), (9606, null), (9607, 'Campus Sede')) as v (id, campus)
where courses.id = v.id;
insert into staging.curriculum_courses (source_id, institution_inep_code, name, city, units) values
  (9503, 98001, 'Administração', 'São Paulo', array['Butantã']),
  (9504, 98001, 'Administração', 'São Paulo', array['Liberdade']),
  (9505, 98001, 'Administração', 'São Paulo', array['Butantã', 'Mooca']);

select is(
  array(select staging.curriculum_course_ids(9503, 'São Paulo') order by 1), array[9601::bigint],
  'one unit links only the census course on that campus');
select is(
  array(select staging.curriculum_course_ids(9504, 'São Paulo')), array[]::bigint[],
  'a unit with no census campus links to nothing');
select is(
  array(select staging.curriculum_course_ids(9505, 'São Paulo') order by 1), array[9601::bigint, 9603],
  'two units link both campuses');

select * from finish();
rollback;
