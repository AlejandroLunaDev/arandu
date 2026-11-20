begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into public.sources (id, adapter, url, label) overriding system value values
  (9501, 't_inst', 'https://example.test/disc-inst', 'census'),
  (9502, 't_page', 'https://example.test/disc-page', 'page');
insert into public.institutions (id, inep_code, name, kind, source_id) overriding system value values (9501, 57, 'Disciplines University', 'public', 9501);
insert into public.courses (id, inep_code, institution_id, name, degree, city, source_id) overriding system value values
  (9601, 992001, 9501, 'Matemática', 'bacharelado', 'São Paulo', 9501);
insert into public.disciplines (id, institution_id, code, name, topics, source_id) overriding system value values
  (9701, 9501, 'MAT1', 'Cálculo I', array['Limites', 'Derivadas', 'Integrais'], 9502);
insert into public.curriculum_subjects (id, course_id, year, term, name, source_id, discipline_id) overriding system value values
  (9801, 9601, 1, 1, 'Cálculo I', 9502, 9701);

select has_column('public', 'disciplines', 'topics', 'disciplines.topics exists');
select col_type_is('public', 'disciplines', 'topics', 'text[]', 'topics is text[]');
select col_type_is('public', 'disciplines', 'bibliography', 'text[]', 'bibliography is text[]');
select col_type_is('public', 'curriculum_subjects', 'discipline_id', 'bigint', 'curriculum_subjects.discipline_id is bigint');
select is((select topics from public.disciplines where id = 9701), array['Limites', 'Derivadas', 'Integrais'], 'topics keeps element order');
select throws_ok($$insert into public.disciplines (institution_id, code, name, source_id) values (9501, 'MAT1', 'Dup', 9502)$$, '23505', null, 'duplicate (institution_id, code) fails');
select throws_ok($$insert into public.disciplines (institution_id, code, name, topics, source_id) values (9501, 'MAT2', 'Empty', '{}', 9502)$$, '23514', null, 'empty topics array fails');
select lives_ok($$insert into public.disciplines (institution_id, code, name, topics, source_id) values (9501, 'MAT3', 'Null', null, 9502)$$, 'null topics passes');

delete from public.disciplines where id = 9701;
select is((select count(*)::int from public.curriculum_subjects where id = 9801 and discipline_id is null), 1, 'deleting a discipline nulls discipline_id and keeps the subject');

select ok((select relrowsecurity from pg_class where oid = 'public.disciplines'::regclass), 'RLS is enabled on public.disciplines');

select * from finish();
rollback;
