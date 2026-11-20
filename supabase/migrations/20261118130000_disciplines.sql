-- A discipline as its institution publishes it once, shared by every curriculum that lists it: USP's Júpiter
-- obterDisciplina page for 'MAT2453' (Cálculo I) serves all the courses whose grade names that code. Only facts are
-- kept: the topics of its 'Conteúdo Programático' and the titles of its 'Bibliografia'; its 'Objetivos' prose is not
-- (owner, 2026-11-18). The path turns each topic into one stop.

create table public.disciplines (
  id bigint generated always as identity primary key,
  institution_id bigint not null references public.institutions (id) on delete cascade,
  code text not null,                -- the institution's own code, e.g. USP's sigla 'MAT2453'
  name text not null,
  topics text[],                     -- one element per topic, in the source's order; null when none is published
  bibliography text[],               -- one element per listed title, in the source's order; null when none
  source_id bigint not null references public.sources (id),
  unique (institution_id, code),
  check (topics is null or cardinality(topics) > 0),
  check (bibliography is null or cardinality(bibliography) > 0)
);
create index disciplines_source_id_idx on public.disciplines (source_id);
alter table public.disciplines enable row level security;

-- The discipline a curriculum row names; null when its source publishes no discipline page.
alter table public.curriculum_subjects
  add column discipline_id bigint references public.disciplines (id) on delete set null;
create index curriculum_subjects_discipline_id_idx on public.curriculum_subjects (discipline_id);
