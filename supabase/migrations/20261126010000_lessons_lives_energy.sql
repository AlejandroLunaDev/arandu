-- #145: a chapter has three lessons, a lesson has lives, peixinhos are the energy and caixas bring a currency. Novelos
-- are removed from the API. Their columns and chapter_rereads stay unused for now: the API on main still reads them,
-- so they are dropped in a later migration, once main runs this code.

alter table public.wallets
  add column currency integer not null default 0 check (currency >= 0),
  add column peixinhos_on date;

comment on column public.wallets.peixinhos is
  'The energy: entering a lesson costs some. Topped up to the daily amount once per São Paulo day; more is kept.';
comment on column public.wallets.peixinhos_on is 'The São Paulo day of the last top-up; null before the first.';
comment on column public.wallets.currency is
  'The game''s currency (its name is not chosen yet): it comes in caixas and buys going on after a lesson''s last life.';

-- Lesson 4, the review, is gone. No lesson result is stored yet, and the web on main does not call lessons.
alter table public.lesson_results
  drop constraint lesson_results_lesson_check,
  add constraint lesson_results_lesson_check check (lesson between 1 and 3);

comment on column public.caixas.reason is
  'Why it was earned, once each: ''lesson:<discipline>:<topic>:<lesson>'', ''season:<n>:<level>'', ''promotion:<league>'' or ''demo_finished''.';
