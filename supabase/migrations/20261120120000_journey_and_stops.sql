-- The person's journey before and after login (O02-O21): what they chose, the stops' content and the stops they
-- finished. Anonymous users (Supabase signInAnonymously) own rows here too; linking Google keeps the same user id, so
-- nothing moves at login. RLS is on with no policies: only the API, as the database owner, reads and writes them.

create table public.journeys (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- O02-O08 as the person answered (OnboardingAnswer[]): the options tapped and their own words, never audio.
  answers jsonb check (answers is null or jsonb_typeof(answers) = 'array'),
  -- O10-O11. A catalog reload that drops a row clears the choice instead of failing.
  profession_slug text references public.professions (slug) on delete set null,
  course_id bigint references public.courses (id) on delete set null,
  -- The subject the path starts with: the book with the paw.
  discipline_id bigint references public.disciplines (id) on delete set null,
  -- O12: days per week.
  weekly_goal smallint check (weekly_goal in (3, 5, 7)),
  -- O20: self-declared, no document.
  age smallint check (age between 10 and 120),
  updated_at timestamptz not null default now()
);

create index journeys_course on public.journeys (course_id);
create index journeys_discipline on public.journeys (discipline_id);
create index journeys_profession on public.journeys (profession_slug);

-- One stop per official topic of a subject (topic = its index in disciplines.topics). Generated on the first visit
-- and kept for everyone after; topic_text is the topic it was made from, so a changed topic regenerates it.
create table public.stop_contents (
  discipline_id bigint not null references public.disciplines (id) on delete cascade,
  topic smallint not null check (topic >= 0),
  topic_text text not null,
  -- Cards with their cited sources and the exercises (StopContent in @arandu/contracts).
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  created_at timestamptz not null default now(),
  primary key (discipline_id, topic)
);

-- A stop the person finished. The first finish counts; replaying a stop gives nothing again.
create table public.stop_results (
  user_id uuid not null references auth.users (id) on delete cascade,
  discipline_id bigint not null references public.disciplines (id) on delete cascade,
  topic smallint not null check (topic >= 0),
  mistakes smallint not null check (mistakes between 0 and 100),
  sabedoria smallint not null check (sabedoria >= 0),
  completed_at timestamptz not null default now(),
  primary key (user_id, discipline_id, topic)
);

create index stop_results_discipline on public.stop_results (discipline_id);
create index stop_results_user_completed on public.stop_results (user_id, completed_at);

alter table public.journeys enable row level security;
alter table public.stop_contents enable row level security;
alter table public.stop_results enable row level security;

revoke all on public.journeys, public.stop_contents, public.stop_results from anon, authenticated;

-- Anonymous users nobody came back to: deleted 30 days after they were created; the foreign keys cascade their rows.
create extension if not exists pg_cron;

select cron.schedule(
  'delete-stale-anonymous-users',
  '15 6 * * *',
  $$delete from auth.users where is_anonymous and created_at < now() - interval '30 days'$$
);
