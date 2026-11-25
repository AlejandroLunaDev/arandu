-- O10: a talk with Arandu among the recommended careers, before choosing one. It is about several careers, so it has
-- no profession_slug (the existing check keeps profession_slug only on 'career' sessions).
alter table public.arandu_sessions drop constraint arandu_sessions_kind_check;
alter table public.arandu_sessions add constraint arandu_sessions_kind_check
  check (kind in ('onboarding', 'career', 'choosing'));
