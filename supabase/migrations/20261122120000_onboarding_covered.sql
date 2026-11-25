-- The onboarding topics a session has covered so far. The model rebuilds its list every turn and can drop one, so
-- the API keeps the union here: progress never goes back and a topic already answered is never asked again.
alter table public.arandu_sessions add column covered text[] not null default '{}';
