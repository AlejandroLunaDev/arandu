-- The landing's two own books, one figure per page: 'solucao' tells the problem Arandu comes to solve, 'produto' what
-- Arandu brings, measured on this database. Each figure carries its source; Arandu's own counts were measured on the
-- real DB on 2026-11-18 and are a snapshot, not recomputed (MVP, owner 2026-11-18). The web's Fact shape maps 1:1.
-- RLS is on with no policies, like the catalog: the API reads it with its own connection.

create table public.story_facts (
  id bigint generated always as identity primary key,
  book text not null check (book in ('produto', 'solucao')),
  position smallint not null check (position > 0),  -- page order inside its book
  figure text not null,                              -- '1 em 4', '7.370.879', or a heading
  text text not null,                                -- pt-BR, the interface language
  source_label text,
  source_url text,                                   -- null when the figure is Arandu's own count, which has no one page
  verified_on date not null,
  unique (book, position),
  check (source_url is null or source_label is not null)
);
alter table public.story_facts enable row level security;

insert into public.story_facts (book, position, figure, text, source_label, source_url, verified_on) values
  ('solucao', 1, '1 em 4',
    'estudantes de cursos presenciais deixou o curso em 2024 (24,8%). No ensino a distância, 41,6%.',
    'Semesp, Mapa do Ensino Superior, 16ª ed.', 'https://www.semesp.org.br/mapa/edicao-16/brasil/', '2026-11-18'),
  ('solucao', 2, '7.370.879',
    'matrículas no ensino médio no Brasil, em 2025.',
    'INEP, Censo Escolar 2025',
    'https://www.gov.br/inep/pt-br/centrais-de-conteudo/noticias/censo-escolar/inep-apresenta-os-grandes-numeros-da-educacao-basica',
    '2026-11-18'),
  ('solucao', 3, 'Projeto de vida',
    'A lei assegura aos estudantes oportunidades de construir seus projetos de vida.',
    'Lei 14.945/2024, LDB art. 35-B, § 2º', 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/l14945.htm',
    '2026-11-18'),
  ('produto', 1, 'Viver antes de escolher',
    'Com o Arandu, você experimenta uma carreira por dentro: matérias reais do primeiro semestre, com fonte. Família e escola acompanham a jornada junto com você.',
    null, null, '2026-11-18'),
  ('produto', 2, '545',
    'instituições de ensino superior com curso presencial em São Paulo.',
    'INEP, Censo da Educação Superior 2024',
    'https://download.inep.gov.br/microdados/microdados_censo_da_educacao_superior_2024.zip', '2026-11-18'),
  ('produto', 3, '7.863',
    'cursos de graduação presenciais em São Paulo.',
    'INEP, Censo da Educação Superior 2024',
    'https://download.inep.gov.br/microdados/microdados_censo_da_educacao_superior_2024.zip', '2026-11-18'),
  ('produto', 4, '9.416',
    'notas de corte do SISU, do ProUni e do ENEM-USP, de 2020 a 2026.',
    'MEC, Acesso Único (SISU e ProUni), e Fuvest (ENEM-USP)', 'https://acessounico.mec.gov.br/busca', '2026-11-18'),
  ('produto', 5, '839',
    'cursos de 24 instituições com a grade curricular real: 76.428 matérias.',
    'Grades publicadas pelas próprias instituições, cada uma com seu link', null, '2026-11-18'),
  ('produto', 6, '1.143',
    'temas reais de 109 matérias do primeiro semestre da USP, em 60 carreiras.',
    'USP, JupiterWeb', 'https://uspdigital.usp.br/jupiterweb/', '2026-11-18'),
  ('produto', 7, '2.085',
    'fontes públicas citadas, de 76 sites.',
    'Base de dados do Arandu Reka', null, '2026-11-18');
