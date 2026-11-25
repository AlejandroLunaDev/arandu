-- Each person's novelos, peixinhos and page markers (all amounts are demo values), and the stops whose cards they
-- re-read at 0 novelos for a free one. RLS is on with no policies: only the API reads and writes them.

create table public.wallets (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- Mistakes spend them; one comes back every 30 minutes up to 5, counted from novelos_at.
  novelos smallint not null default 5 check (novelos between 0 and 5),
  novelos_at timestamptz not null default now(),
  -- Earned only, never sold.
  peixinhos integer not null default 120 check (peixinhos >= 0),
  marcadores smallint not null default 0 check (marcadores between 0 and 2),
  updated_at timestamptz not null default now()
);

create table public.stop_rereads (
  user_id uuid not null references auth.users (id) on delete cascade,
  discipline_id bigint not null references public.disciplines (id) on delete cascade,
  topic smallint not null check (topic >= 0),
  created_at timestamptz not null default now(),
  primary key (user_id, discipline_id, topic)
);

create index stop_rereads_discipline on public.stop_rereads (discipline_id);

alter table public.wallets enable row level security;
alter table public.stop_rereads enable row level security;

revoke all on public.wallets, public.stop_rereads from anon, authenticated;
