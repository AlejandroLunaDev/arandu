-- What Arandu remembers about each signed-in person (docs/01-product-design.md §5): their conversations, the profile
-- they confirmed, and a short summary of past sessions. Deleting a person's memory, or their account, removes it all.
-- RLS is on with no policies: only the API, as the database owner, reads and writes these tables.

create table public.arandu_memories (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- The profile the person confirmed on S3 (AranduProfile in @arandu/contracts); null until they do.
  profile jsonb check (profile is null or jsonb_typeof(profile) = 'object'),
  -- Arandu's note on past sessions, in Brazilian Portuguese; the person can read it. The cap is the memory's limit.
  summary text not null default '' check (char_length(summary) <= 1500),
  updated_at timestamptz not null default now()
);

create table public.arandu_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('onboarding', 'career')),
  profession_slug text references public.professions (slug),
  started_at timestamptz not null default now(),
  -- Set once the session is folded into arandu_memories.summary.
  summarized_at timestamptz,
  check ((kind = 'career') = (profession_slug is not null))
);

create index arandu_sessions_user_started on public.arandu_sessions (user_id, started_at);

create table public.arandu_messages (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.arandu_sessions (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index arandu_messages_session on public.arandu_messages (session_id, id);

alter table public.arandu_memories enable row level security;
alter table public.arandu_sessions enable row level security;
alter table public.arandu_messages enable row level security;

revoke all on public.arandu_memories, public.arandu_sessions, public.arandu_messages from anon, authenticated;
