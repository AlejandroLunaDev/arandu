-- #123: a chapter (one stop) is 4 lessons. Each finished lesson is a row: the exercises missed in it and the
-- sabedoria it gave, 0 on a replay. Lesson 4 also writes the chapter's stop_results row. RLS is on with no policies:
-- only the API reads and writes it.

create table public.lesson_results (
  user_id uuid not null references public.users (id) on delete cascade,
  discipline_id bigint not null references public.disciplines (id) on delete cascade,
  topic smallint not null check (topic >= 0),
  lesson smallint not null check (lesson between 1 and 4),
  -- [{ "topic": n, "index": n }]: the exercises missed, by where they live (the review mixes earlier chapters).
  missed jsonb not null default '[]' check (jsonb_typeof(missed) = 'array'),
  sabedoria smallint not null check (sabedoria >= 0),
  completed_at timestamptz not null default now(),
  primary key (user_id, discipline_id, topic, lesson)
);

create index lesson_results_discipline on public.lesson_results (discipline_id);
create index lesson_results_user_completed on public.lesson_results (user_id, completed_at);

alter table public.lesson_results enable row level security;
revoke all on public.lesson_results from anon, authenticated;
