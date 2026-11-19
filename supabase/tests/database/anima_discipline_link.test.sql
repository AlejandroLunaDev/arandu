begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

-- Two Ânima institutions with a course each; an anima_ementas source holding a discipline of each, plus a
-- same-named discipline of the first institution that another adapter's source holds.
insert into public.sources (id, adapter, url, label) overriding system value values
  (9931, 't_inst', 'https://example.test/anima-census', 'census'),
  (9932, 'anima_curriculum', 'https://example.test/anima/a', 'grade a'),
  (9933, 'anima_ementas', 'https://example.test/anima/ementas', 'ementas'),
  (9934, 't_page', 'https://example.test/anima/other', 'other adapter grade'),
  (9935, 'anima_curriculum', 'https://example.test/anima/b', 'grade b');
insert into public.institutions (id, inep_code, name, kind, source_id) overriding system value values
  (9931, 9990031, 'Anima A', 'private', 9931), (9932, 9990032, 'Anima B', 'private', 9931);
insert into public.courses (id, inep_code, institution_id, name, degree, city, source_id) overriding system value values
  (9931, 990931, 9931, 'Curso A', 'bacharelado', 'São Paulo', 9931),
  (9932, 990932, 9932, 'Curso B', 'bacharelado', 'São Paulo', 9931);
insert into public.disciplines (id, institution_id, code, name, topics, source_id) overriding system value values
  (9931, 9931, 'calculo', 'Cálculo', array['a'], 9933),
  (9932, 9932, 'calculo', 'Cálculo', array['b'], 9933),
  (9933, 9931, 'fisica', 'Física', array['f'], 9931);
insert into public.curriculum_subjects (course_id, year, name, source_id) values
  (9931, 1, 'CÁLCULO', 9932), (9931, 1, 'Física', 9932), (9931, 1, 'Sem Ementa', 9932),
  (9932, 1, 'Cálculo', 9935),
  (9931, 1, 'Cálculo', 9934);

select is(staging.link_disciplines(9932), 1, 'an Ânima grade links its one subject that an ementa describes (name_key ignores case and accents)');
select is((select discipline_id from public.curriculum_subjects where source_id = 9932 and name = 'CÁLCULO'), 9931::bigint, 'to the discipline of its own course''s institution');
select is((select discipline_id from public.curriculum_subjects where source_id = 9932 and name = 'Física'), null, 'a same-named discipline held by another adapter''s source is not used');
select is((select discipline_id from public.curriculum_subjects where source_id = 9932 and name = 'Sem Ementa'), null, 'a subject without an ementa stays unlinked');
select is(staging.link_disciplines(9932), 0, 'a second link changes nothing');
select is(staging.link_disciplines(9935), 1, 'the other institution''s grade links too');
select is((select discipline_id from public.curriculum_subjects where source_id = 9935), 9932::bigint, 'to its own institution''s discipline, not the first institution''s');

-- Another adapter's source never takes the rule.
select is(staging.link_disciplines(9934), 0, 'a source of another adapter links nothing');
select is((select discipline_id from public.curriculum_subjects where source_id = 9934), null, 'and stays unlinked');

-- The rule leaves the existing branches alone: a described Mackenzie grade still links to its own page's discipline.
update public.sources set adapter = 'mackenzie_curriculum' where id = 9934;
update public.disciplines set source_id = 9934 where id = 9933;
update public.curriculum_subjects set name = 'FÍSICA' where source_id = 9934;
select is(staging.link_disciplines(9934), 1, 'the Mackenzie branch still links');
select is((select discipline_id from public.curriculum_subjects where source_id = 9934), 9933::bigint, 'to its own page''s discipline');

select * from finish();
rollback;
