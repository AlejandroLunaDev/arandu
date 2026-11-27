-- #157: the demo careers' mandatory first-semester subjects whose own program was not loaded, so they played another
-- discipline of the same name (15, measured 2026-11-27). Each code is the one the career's own grade page lists, and
-- each url names that grade (codcur, codhab) so usp_discipline links the subject to it. Educação física's grade is
-- codhab 200, although its first-period rows link with codhab 100: the link rule needs the grade's own pair.
insert into public.sources (adapter, url, label)
select 'usp_discipline', url, 'USP JupiterWeb, disciplina ' || substring(url from 'sgldis=([A-Z0-9]+)') || ' (' || career || ')'
from (values
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=MAT2453&codcur=45052&codhab=0', 'Ciência da computação'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=EAC0217&codcur=12033&codhab=1', 'Contabilidade'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=BMA0128&codcur=39041&codhab=200', 'Educação física'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=BMC0111&codcur=39041&codhab=200', 'Educação física'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=QBQ0102&codcur=39041&codhab=200', 'Educação física'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=EFP0137&codcur=39041&codhab=200', 'Educação física'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=BMB0108&codcur=39041&codhab=200', 'Educação física'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=3900008&codcur=39041&codhab=200', 'Educação física'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=2000101&codcur=3023&codhab=3000', 'Engenharia civil'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=MAC2166&codcur=3023&codhab=3000', 'Engenharia civil'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=BMA0137&codcur=5052&codhab=0', 'Fisioterapia'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=BMA0141&codcur=6012&codhab=2', 'Nutrição'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=QBQ0313&codcur=6012&codhab=2', 'Nutrição'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=FSL0118&codcur=47012&codhab=100', 'Psicologia'),
  ('https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=CCA0258&codcur=27011&codhab=502', 'Publicidade e propaganda')
) as pages (url, career)
on conflict (url) do nothing;
