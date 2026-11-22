-- The API owns users and sessions (the v2.0 model): Supabase Auth only proves a Google identity at sign-in.
-- A guest is a user with no Google identity yet; one Google identity per user, matched by Google's subject id,
-- never by email.

create table public.users (
  id uuid primary key default gen_random_uuid(),
  -- Google's subject id (Supabase identity_data.sub). Null: a guest.
  google_sub text unique,
  email text,
  name text,
  avatar_url text,
  -- Set: every request and refresh of this user is refused with user_banned.
  banned_at timestamptz,
  created_at timestamptz not null default now(),
  -- Moved on every refresh; a guest unseen for 30 days is deleted (cron below).
  last_seen_at timestamptz not null default now()
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  user_agent text,
  ip text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  -- Absolute lifetime: the session ends here even if it is used every day.
  expires_at timestamptz not null,
  revoked_at timestamptz,
  revoked_reason text check (revoked_reason in ('logout', 'logout_all', 'reuse_detected', 'switched'))
);

create index sessions_user on public.sessions (user_id);

-- The refresh-token family of a session. Only the SHA-256 of each token is stored.
create table public.session_refresh_tokens (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.sessions (id) on delete cascade,
  token_hash char(64) not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index session_refresh_tokens_session on public.session_refresh_tokens (session_id);

alter table public.users enable row level security;
alter table public.sessions enable row level security;
alter table public.session_refresh_tokens enable row level security;

revoke all on public.users, public.sessions, public.session_refresh_tokens from anon, authenticated;

-- The people Supabase Auth already holds keep their id, so their rows survive the foreign keys moving below.
insert into public.users (id, google_sub, email, name, avatar_url, created_at, last_seen_at)
select
  u.id,
  i.identity_data ->> 'sub',
  i.identity_data ->> 'email',
  coalesce(i.identity_data ->> 'full_name', i.identity_data ->> 'name'),
  coalesce(i.identity_data ->> 'avatar_url', i.identity_data ->> 'picture'),
  u.created_at,
  coalesce(u.last_sign_in_at, u.created_at)
from auth.users u
left join auth.identities i on i.user_id = u.id and i.provider = 'google';

-- Every person table now hangs from public.users; the constraint names stay the same.
do $$
declare
  t text;
begin
  foreach t in array array[
    'journeys', 'wallets', 'stop_results', 'stop_rereads', 'stop_questions', 'players', 'owned_items',
    'caixas', 'season_claims', 'arandu_memories', 'arandu_sessions', 'arandu_facts', 'book_reflections'
  ] loop
    execute format('alter table public.%I drop constraint %I', t, t || '_user_id_fkey');
    execute format(
      'alter table public.%I add constraint %I foreign key (user_id) references public.users (id) on delete cascade',
      t, t || '_user_id_fkey'
    );
  end loop;
end $$;

-- Guests nobody came back to, 30 days after their last refresh (the refresh token's idle lifetime): the foreign
-- keys cascade their rows. Ended sessions go too, and spent refresh tokens after a week: one is spent every 15
-- minutes of use, and a week still catches a stolen token replayed late (reuse detection).
select cron.unschedule('delete-stale-anonymous-users');

select cron.schedule(
  'delete-stale-guests',
  '15 6 * * *',
  $$delete from public.users where google_sub is null and last_seen_at < now() - interval '30 days';
    delete from public.sessions where revoked_at < now() - interval '7 days' or expires_at < now();
    delete from public.session_refresh_tokens where revoked_at < now() - interval '7 days'$$
);
