-- Settings of the game that an admin may change later (no panel yet): one row. RLS is on with no policies: only the
-- API reads it.
--
-- League rounds: round n starts on league_anchor_on + n * league_period_days (São Paulo days) and is settled (top 7
-- move up) when the league is read in a later round. To change the period without breaking the round in progress,
-- set league_anchor_on to the day the current round ends together with the new period.

create table public.game_settings (
  id boolean primary key default true check (id),
  league_period_days smallint not null check (league_period_days between 1 and 28),
  league_anchor_on date not null,
  updated_at timestamptz not null default now()
);

alter table public.game_settings enable row level security;
revoke all on public.game_settings from anon, authenticated;

-- 1-day rounds for testing and the demo; the anchor is a Monday, so 7 gives back weekly rounds.
insert into public.game_settings (league_period_days, league_anchor_on) values (1, '2026-11-16');

comment on column public.players.league_week is 'The first day of the league round it holds for (see game_settings).';
