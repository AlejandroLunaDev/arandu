-- #124: 3 novelos a day, all back at São Paulo midnight (the API reads novelos_at's day), and one more for peixinhos
-- at 0, priced by how many were bought that day.

update public.wallets set novelos = least(novelos, 3) where novelos > 3;

alter table public.wallets
  drop constraint wallets_novelos_check,
  add constraint wallets_novelos_check check (novelos between 0 and 3),
  alter column novelos set default 3,
  add column novelos_bought smallint not null default 0 check (novelos_bought >= 0),
  add column novelos_bought_on date;

comment on column public.wallets.novelos is 'Left today; novelos_at is when they were last changed, and a later São Paulo day starts at 3.';
comment on column public.wallets.novelos_bought is 'Novelos bought on novelos_bought_on, the São Paulo day of the last purchase; it prices the next one.';
