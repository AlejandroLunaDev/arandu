begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

-- Valid rows (ids looked up, since identity sequences survive rollbacks).
select lives_ok($$insert into sources (adapter, url, label) values ('inep_census', 'https://example.test/inep', 'INEP')$$, 'valid source');
select lives_ok($$insert into professions (slug, name) values ('psicologia', 'Psicologia')$$, 'valid profession');
select lives_ok($$insert into institutions (inep_code, name, short_name, kind, source_id)
  values (1, 'U', 'U', 'public', (select id from sources limit 1))$$, 'valid institution');
select lives_ok($$insert into courses (inep_code, institution_id, profession_id, name, degree, shift, duration_years, city, source_id)
  values (10, (select id from institutions where inep_code = 1), (select id from professions limit 1), 'Psicologia', 'bacharelado', 'integral', 5, 'Santos', (select id from sources limit 1))$$, 'valid course');
select lives_ok($$insert into admission_cutoffs (course_id, route, metric, edition_year, edition_term, quota_code, quota_label, score, source_id)
  values ((select id from courses where inep_code = 10), 'sisu', 'final_cutoff', 2024, 1, 'AC', 'Ampla concorrência', 752.40, (select id from sources limit 1))$$, 'valid cut-off');
select lives_ok($$insert into curriculum_subjects (course_id, year, term, name, source_id)
  values ((select id from courses where inep_code = 10), 1, null, 'Neuroanatomia', (select id from sources limit 1))$$, 'valid curriculum subject');

-- Constraint violations.
select throws_ok($$insert into institutions (inep_code, name, kind, source_id, photo_url)
  values (2, 'X', 'public', (select id from sources limit 1), 'http://p')$$, '23514', null, 'photo without attribution');
select throws_ok($$insert into institutions (inep_code, name, kind, source_id)
  values (3, 'X', 'other', (select id from sources limit 1))$$, '23514', null, 'unknown institution kind');
select throws_ok($$insert into admission_cutoffs (course_id, route, metric, edition_year, edition_term, quota_code, quota_label, score, source_id)
  values ((select id from courses where inep_code = 10), 'sisu', 'final_cutoff', 2024, 1, 'AC', 'dup', 1, (select id from sources limit 1))$$, '23505', null, 'duplicate cut-off');
select throws_ok($$insert into curriculum_subjects (course_id, year, term, name, source_id)
  values ((select id from courses where inep_code = 10), 1, null, 'Neuroanatomia', (select id from sources limit 1))$$, '23505', null, 'duplicate subject with null term');
select throws_ok($$insert into admission_cutoffs (course_id, route, metric, edition_year, quota_code, quota_label, score, source_id)
  values ((select id from courses where inep_code = 10), 'sisu', 'final_cutoff', 2024, 'AC', 'x', 1001, (select id from sources limit 1))$$, '23514', null, 'score above 1000');
select throws_ok($$insert into professions (slug, name) values ('Bad Slug', 'x')$$, '23514', null, 'invalid slug');

-- Scholarship on cut-offs and logo licence.
select lives_ok($$insert into admission_cutoffs (course_id, route, metric, edition_year, edition_term, quota_code, quota_label, score, scholarship, source_id)
  values ((select id from courses where inep_code = 10), 'prouni', 'final_cutoff', 2025, 1, 'AC', 'Ampla concorrência', 700, 'integral', (select id from sources limit 1))$$, 'prouni cut-off with scholarship');
select throws_ok($$insert into admission_cutoffs (course_id, route, metric, edition_year, edition_term, quota_code, quota_label, score, scholarship, source_id)
  values ((select id from courses where inep_code = 10), 'prouni', 'final_cutoff', 2025, 1, 'AC', 'x', 700, null, (select id from sources limit 1))$$, '23514', null, 'prouni cut-off without scholarship');
select throws_ok($$insert into admission_cutoffs (course_id, route, metric, edition_year, edition_term, quota_code, quota_label, score, scholarship, source_id)
  values ((select id from courses where inep_code = 10), 'sisu', 'final_cutoff', 2025, 1, 'AC', 'x', 700, 'parcial', (select id from sources limit 1))$$, '23514', null, 'sisu cut-off with scholarship');
insert into admission_cutoffs (course_id, route, metric, edition_year, edition_term, quota_code, quota_label, score, scholarship, source_id)
  values ((select id from courses where inep_code = 10), 'prouni', 'final_cutoff', 2023, 1, 'AC', 'x', 700, 'integral', (select id from sources limit 1));
select lives_ok($$insert into admission_cutoffs (course_id, route, metric, edition_year, edition_term, quota_code, quota_label, score, scholarship, source_id)
  values ((select id from courses where inep_code = 10), 'prouni', 'final_cutoff', 2023, 1, 'AC', 'x', 650, 'parcial', (select id from sources limit 1))$$, 'same prouni cut-off with another scholarship');
select throws_ok($$insert into institutions (inep_code, name, kind, source_id, logo_url, logo_source_url)
  values (4, 'X', 'public', (select id from sources limit 1), 'http://l', 'http://s')$$, '23514', null, 'logo without licence');
select lives_ok($$insert into institutions (inep_code, name, kind, source_id, logo_url, logo_source_url, logo_license)
  values (5, 'X', 'public', (select id from sources limit 1), 'http://l', 'http://s', 'CC BY 4.0')$$, 'logo with licence');

-- RLS.
select is(
  (select count(*)::int from pg_class
   where oid in ('public.sources'::regclass, 'public.scrape_runs'::regclass, 'public.professions'::regclass,
                 'public.institutions'::regclass, 'public.courses'::regclass,
                 'public.admission_cutoffs'::regclass, 'public.curriculum_subjects'::regclass)
     and relrowsecurity),
  7, 'RLS enabled on all 7 tables');

set local role anon;
select is((select count(*)::int from public.courses), 0, 'anon reads no courses');
reset role;

select * from finish();
rollback;
