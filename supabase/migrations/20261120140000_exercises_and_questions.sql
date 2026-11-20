-- The stop's revisão relâmpago result (earns "Relâmpago") and the questions people ask Arandu about a stop's cards
-- (T1, counted by "Curiosidade de gato" and listed in "Suas conversas"). RLS is on with no policies: API only.

alter table public.stop_results
  add column relampago_mistakes smallint check (relampago_mistakes between 0 and 100);

create table public.stop_questions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  discipline_id bigint not null references public.disciplines (id) on delete cascade,
  topic smallint not null check (topic >= 0),
  question text not null check (char_length(question) between 1 and 500),
  answer text not null check (char_length(answer) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index stop_questions_user_created on public.stop_questions (user_id, created_at);
create index stop_questions_discipline on public.stop_questions (discipline_id);

alter table public.stop_questions enable row level security;

revoke all on public.stop_questions from anon, authenticated;
