-- Enfermagem's two subjects also link to the bacharelado grade (codhab 0), which lists them as well; the seed in
-- 20261118150000 pointed at the licenciatura grade (codhab 100), whose census course is the formação de professor.
insert into public.sources (adapter, url, label, refresh_interval) values
  ('usp_discipline', 'https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=ENO0103&codcur=7012&codhab=0',
   'USP JupiterWeb, disciplina ENO0103 (Enfermagem, bacharelado)', interval '1 year'),
  ('usp_discipline', 'https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=FSL0118&codcur=7012&codhab=0',
   'USP JupiterWeb, disciplina FSL0118 (Enfermagem, bacharelado)', interval '1 year');
