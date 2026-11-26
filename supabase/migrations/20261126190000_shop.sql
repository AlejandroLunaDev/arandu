-- #153: a shop paid in the currency. Extra lives are kept in the wallet, and the week's promotion is bought once per
-- person per São Paulo week. Bought caixas use the reason 'shop:<tier>:<uuid>'. While caixas are bought with the
-- currency, the currency is never sold for money (ECA Digital art. 20).
-- RLS is on with no policies: only the API reads and writes them.

alter table public.wallets
  add column vidas integer not null default 0 check (vidas >= 0);

comment on column public.wallets.vidas is
  'Extra lives, from the shop and caixas: after a lesson''s last life, one gives 1 life back.';

create table public.shop_promotions (
  user_id uuid not null references auth.users (id) on delete cascade,
  -- The Monday of the São Paulo week the promotion was bought in.
  week date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, week)
);

alter table public.shop_promotions enable row level security;

revoke all on public.shop_promotions from anon, authenticated;

comment on column public.caixas.reason is
  'Why it was earned, once each: ''lesson:<discipline>:<topic>:<lesson>'', ''season:<n>:<level>'', ''promotion:<league>'', ''demo_finished'', or ''shop:<tier>:<uuid>'' when bought.';
