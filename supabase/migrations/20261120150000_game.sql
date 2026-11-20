-- The game around studying (L1-L7, K1): each person's league and nickname, what they own and wear, their caixas and
-- the season rewards they took. Every reward comes from studying, never from paying (ECA Digital art. 20).
-- RLS is on with no policies: only the API reads and writes them.

create table public.players (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- Shown in the league instead of a name: others see only this and the week's sabedoria.
  nickname text check (char_length(nickname) between 2 and 20),
  -- 1 Calouro .. 6 Sábio, and the Monday of the week it holds for: the week is settled (top 7 move up) when the
  -- league is read in a later week.
  league smallint not null default 1 check (league between 1 and 6),
  league_week date not null,
  -- A promotion the person has not seen yet (L7): the league they moved up from.
  promoted_from smallint check (promoted_from between 1 and 5),
  -- The outfit Arandu wears: an owned outfit item, or null for the highest league reached.
  wearing text,
  updated_at timestamptz not null default now()
);

create table public.owned_items (
  user_id uuid not null references auth.users (id) on delete cascade,
  -- 'outfit:<league>' or 'room:<item>'.
  item text not null check (item ~ '^(outfit|room):[a-z_]+$'),
  created_at timestamptz not null default now(),
  primary key (user_id, item)
);

create table public.caixas (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Why it was earned, once each: 'season:<n>:<level>', 'promotion:<league>' or 'demo_finished' (every stop
  -- of a subject done).
  reason text not null,
  created_at timestamptz not null default now(),
  opened_at timestamptz,
  -- What it held, rolled on the server when opened.
  contents jsonb check (contents is null or jsonb_typeof(contents) = 'object'),
  unique (user_id, reason)
);

create table public.season_claims (
  user_id uuid not null references auth.users (id) on delete cascade,
  season smallint not null,
  level smallint not null check (level between 1 and 8),
  created_at timestamptz not null default now(),
  primary key (user_id, season, level)
);

alter table public.players enable row level security;
alter table public.owned_items enable row level security;
alter table public.caixas enable row level security;
alter table public.season_claims enable row level security;

revoke all on public.players, public.owned_items, public.caixas, public.season_claims from anon, authenticated;
