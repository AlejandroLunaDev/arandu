-- The demo aims at the careers most studied in São Paulo city (INEP census 2024, matrículas: the top 20 hold 63%).
-- Thirteen of them lack topics for some mandatory first-semester subjects, and each has a USP grid whose subjects all
-- publish a JupiterWeb page: these are the 44 missing ones (owner, 2026-11-25), one topic source per subject (ADR-0008).
insert into public.sources (adapter, url, label)
select 'usp_discipline', url, 'USP JupiterWeb, disciplina ' || substring(url from 'sgldis=([A-Z0-9]+)') || ' (' || career || ')'
from (values
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=AUH0308&codcur=16011&codhab=0', 'Arquitetura e urbanismo'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=AUT0182&codcur=16011&codhab=0', 'Arquitetura e urbanismo'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=AUT0282&codcur=16011&codhab=0', 'Arquitetura e urbanismo'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=AUT0510&codcur=16011&codhab=0', 'Arquitetura e urbanismo'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=PCC0201&codcur=16011&codhab=0', 'Arquitetura e urbanismo'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=MAC0101&codcur=45052&codhab=0', 'Ciência da computação'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=MAC0124&codcur=45052&codhab=0', 'Ciência da computação'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=MAC0329&codcur=45052&codhab=0', 'Ciência da computação'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=EAE0110&codcur=12033&codhab=1', 'Contabilidade'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=BMC0111&codcur=39041&codhab=100', 'Educação física'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=QBQ0102&codcur=39041&codhab=100', 'Educação física'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=PMT3130&codcur=3023&codhab=3000', 'Engenharia civil'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=PTR3111&codcur=3023&codhab=3000', 'Engenharia civil'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=0420413&codcur=9013&codhab=100', 'Farmácia'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=0900200&codcur=9013&codhab=100', 'Farmácia'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=0900302&codcur=9013&codhab=100', 'Farmácia'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=4310183&codcur=9013&codhab=100', 'Farmácia'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=MAT0149&codcur=9013&codhab=100', 'Farmácia'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=QFL0130&codcur=9013&codhab=100', 'Farmácia'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=BIO0115&codcur=5052&codhab=0', 'Fisioterapia'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=BMC0113&codcur=5052&codhab=0', 'Fisioterapia'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=BMM0450&codcur=5052&codhab=0', 'Fisioterapia'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=QBQ0104&codcur=5052&codhab=0', 'Fisioterapia'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=BMB0127&codcur=10012&codhab=0', 'Medicina veterinária'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=BMC0115&codcur=10012&codhab=0', 'Medicina veterinária'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=MAE0110&codcur=10012&codhab=0', 'Medicina veterinária'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=QBQ0116&codcur=10012&codhab=0', 'Medicina veterinária'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=BMC0147&codcur=6012&codhab=2', 'Nutrição'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=0420411&codcur=23012&codhab=0', 'Odontologia'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=1500111&codcur=23012&codhab=0', 'Odontologia'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=2300301&codcur=23012&codhab=0', 'Odontologia'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=2300501&codcur=23012&codhab=0', 'Odontologia'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=4801501&codcur=48015&codhab=103', 'Pedagogia'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=EDA0101&codcur=48015&codhab=103', 'Pedagogia'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=EDF0113&codcur=48015&codhab=103', 'Pedagogia'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=EDF0119&codcur=48015&codhab=103', 'Pedagogia'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=BIO0121&codcur=47012&codhab=100', 'Psicologia'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=BIO0123&codcur=47012&codhab=100', 'Psicologia'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=MAE0116&codcur=47012&codhab=100', 'Psicologia'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=PSC1120&codcur=47012&codhab=100', 'Psicologia'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=PSE1141&codcur=47012&codhab=100', 'Psicologia'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=CCA0288&codcur=27011&codhab=502', 'Publicidade e propaganda'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=CRP0292&codcur=27011&codhab=502', 'Publicidade e propaganda'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=CRP0350&codcur=27011&codhab=502', 'Publicidade e propaganda')
) as pages (url, career)
on conflict (url) do nothing;

-- A career's grid is chosen on its mandatory first-semester subjects only: an elective ('Liga Acadêmica') is not the
-- career's first semester, and counting electives with topics picked FAU-EPUSP's double degree over FAU's own grid. A
-- complete grid (every subject has topics) comes first; one of fewer than four subjects is a partial page, not a
-- semester.
create or replace view public.career_grids as
with grids as (
  select c.profession_id, cs.source_id,
    count(distinct cs.subject_key) as subjects,
    count(distinct cs.subject_key) filter (where exists (
      select 1 from public.subjects su join public.disciplines d on d.id = su.discipline_id
      where su.key = cs.subject_key and cardinality(d.topics) > 0)) as with_topics
  from public.curriculum_subjects cs
  join public.courses c on c.id = cs.course_id
  join public.sources s on s.id = cs.source_id and s.last_fetched_at is not null
  where (cs.term = 1 or (cs.term is null and cs.year = 1)) and cs.is_elective is not true
  group by c.profession_id, cs.source_id
)
select distinct on (profession_id) profession_id, source_id
from grids
order by profession_id, (with_topics = subjects and subjects >= 4) desc, with_topics desc, subjects desc, source_id;
