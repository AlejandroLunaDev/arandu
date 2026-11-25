-- Arandu's memory as facts the person can delete one by one (T2, K5), and their feeling at the end of a book (S4).
-- RLS is on with no policies: only the API reads and writes them.

create table public.arandu_facts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  text text not null check (char_length(text) between 1 and 300),
  -- Where Arandu learned it.
  source text not null check (source in ('onboarding', 'stop', 'conversation')),
  created_at timestamptz not null default now()
);

create index arandu_facts_user on public.arandu_facts (user_id, id);

-- Questions on the cards are folded into the facts like sessions are.
alter table public.stop_questions add column summarized_at timestamptz;

create table public.book_reflections (
  user_id uuid not null references auth.users (id) on delete cascade,
  discipline_id bigint not null references public.disciplines (id) on delete cascade,
  chips text[] not null default '{}' check (cardinality(chips) <= 5),
  text text check (char_length(text) between 1 and 500),
  updated_at timestamptz not null default now(),
  primary key (user_id, discipline_id)
);

alter table public.arandu_facts enable row level security;
alter table public.book_reflections enable row level security;

revoke all on public.arandu_facts, public.book_reflections from anon, authenticated;
