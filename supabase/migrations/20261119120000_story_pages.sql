-- The landing's two own books become one spread each: page 1 on the left, page 2 on the right, each with its title.
-- The copy is rewritten for the owner's text of 2026-11-19: an app for anyone choosing a career, at any age, so no
-- school-only framing and no reports to family or school. Every figure was checked at its source on 2026-11-19; a
-- row without a source is Arandu's own statement and carries no figure from elsewhere.

create table public.story_pages (
  book text not null check (book in ('produto', 'solucao')),
  page smallint not null check (page in (1, 2)),  -- 1 = left, 2 = right
  title text not null,
  primary key (book, page)
);
alter table public.story_pages enable row level security;

delete from public.story_facts;
alter table public.story_facts
  alter column figure drop not null,  -- null for a plain statement
  add column page smallint not null,
  add foreign key (book, page) references public.story_pages (book, page),
  drop constraint story_facts_book_position_key,
  add unique (book, page, position);

insert into public.story_pages (book, page, title) values
  ('solucao', 1, 'O problema'),
  ('solucao', 2, 'Por que acontece'),
  ('produto', 1, 'Experimentar antes de escolher'),
  ('produto', 2, 'Feito com dados reais');

insert into public.story_facts (book, page, position, figure, text, source_label, source_url, verified_on) values
  ('solucao', 1, 1, '24,8%',
    'dos estudantes de cursos presenciais deixaram o curso em 2024. No ensino a distância, foram 41,6%.',
    'Semesp, Mapa do Ensino Superior, 16ª ed.', 'https://www.semesp.org.br/mapa/edicao-16/brasil/', '2026-11-19'),
  ('solucao', 1, 2, '60%',
    'de quem entrou na faculdade em 2015 saiu do curso em que entrou em até dez anos, por desistência ou transferência. Só 39% chegou a se formar.',
    'INEP, Resumo Técnico do Censo da Educação Superior 2024',
    'https://download.inep.gov.br/publicacoes/institucionais/avaliacoes_e_exames_da_educacao_superior/resumo_tecnico_do_censo_da_educacao_superior_2024.pdf',
    '2026-11-19'),
  ('solucao', 1, 3, '25%',
    'dos ingressantes em cursos presenciais em 2024 tinham 27 anos ou mais. No ensino a distância, 50% tinham 29 anos ou mais.',
    'INEP, Resumo Técnico do Censo da Educação Superior 2024',
    'https://download.inep.gov.br/publicacoes/institucionais/avaliacoes_e_exames_da_educacao_superior/resumo_tecnico_do_censo_da_educacao_superior_2024.pdf',
    '2026-11-19'),
  ('solucao', 1, 4, '7,4 milhões',
    'de matrículas no ensino médio.',
    'INEP, Censo Escolar 2025',
    'https://www.gov.br/inep/pt-br/centrais-de-conteudo/noticias/censo-escolar/inep-apresenta-os-grandes-numeros-da-educacao-basica',
    '2026-11-19'),
  ('solucao', 2, 1, null,
    'Escolhe-se sem ter vivido a carreira: pelo nome da profissão, pela imagem que se tem dela ou pela opinião dos outros.',
    null, null, '2026-11-19'),
  ('solucao', 2, 2, null,
    'Os dados existem, mas estão espalhados: grades curriculares, notas de corte e formas de ingresso ficam em dezenas de sites, em formatos difíceis de comparar.',
    null, null, '2026-11-19'),
  ('solucao', 2, 3, null,
    'E escolher não acontece uma vez só: quem trabalha e quer mudar de área, quem começou um curso e parou, quem quer voltar a estudar também precisa decidir.',
    null, null, '2026-11-19'),
  ('produto', 1, 1, 'Conhecer você',
    'O Arandu conversa com você para entender seus gostos, suas inclinações e o que te move. O perfil nasce da conversa, não de notas da escola.',
    null, null, '2026-11-19'),
  ('produto', 1, 2, 'Opções reais',
    'Carreiras que combinam com você, com dados de universidades de São Paulo: onde há o curso, como se entra (SISU, ProUni, Fuvest) e a nota de corte, sempre com fonte.',
    null, null, '2026-11-19'),
  ('produto', 1, 3, 'Experimentar um pedaço da carreira',
    '1 ou 2 matérias reais do primeiro semestre. A cada sessão, uma novidade da carreira, um exercício e suas dúvidas respondidas.',
    null, null, '2026-11-19'),
  ('produto', 1, 4, 'Uma pausa para decidir',
    'Ao fim de cada matéria, o Arandu revê com você o que você fez e gostou. Você decide se continua, troca de carreira ou volta.',
    null, null, '2026-11-19'),
  ('produto', 1, 5, 'Quem sou eu',
    'Seu perfil se completa ao longo da jornada.',
    null, null, '2026-11-19'),
  ('produto', 1, 6, null,
    'A conversa com o Arandu é só sua.',
    null, null, '2026-11-19'),
  -- Arandu's own counts, rounded down so each "+" stays true: 545 institutions, 7.863 courses, 9.416 cut-offs
  -- (SISU 2020-2024, ProUni 2023-2026, ENEM-USP 2024-2026), 66.717 distinct subjects of 839 courses, 1.143 topics of
  -- 109 USP subjects in 60 careers, 2.085 sources from 76 hosts (real DB, 2026-11-19).
  ('produto', 2, 1, '+540',
    'instituições e mais de 7.800 cursos presenciais no estado de São Paulo.',
    'INEP, Censo da Educação Superior 2024',
    'https://download.inep.gov.br/microdados/microdados_censo_da_educacao_superior_2024.zip', '2026-11-19'),
  ('produto', 2, 2, '+9.400',
    'notas de corte do SISU, do ProUni e do ENEM-USP, de 2020 a 2026.',
    'MEC, Acesso Único (SISU e ProUni), e Fuvest (ENEM-USP)', 'https://acessounico.mec.gov.br/busca', '2026-11-19'),
  ('produto', 2, 3, '+66 mil',
    'matérias reais, das grades de 839 cursos de 24 instituições.',
    'Grades publicadas pelas próprias instituições, cada uma com seu link', null, '2026-11-19'),
  ('produto', 2, 4, '+1.100',
    'temas do primeiro semestre da USP, em 60 carreiras.',
    'USP, JupiterWeb', 'https://uspdigital.usp.br/jupiterweb/', '2026-11-19'),
  ('produto', 2, 5, '+2 mil',
    'fontes públicas citadas, de 76 sites.',
    'Base de dados do Arandu Reka', null, '2026-11-19');
