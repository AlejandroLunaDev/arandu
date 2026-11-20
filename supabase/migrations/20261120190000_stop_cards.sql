-- A subject's cards, written from one web search for several of its topics and kept per topic: a stop's exercises are
-- made from them when it is first opened, so the search is paid once per subject instead of once per stop.

create table public.stop_cards (
  discipline_id bigint not null references public.disciplines (id) on delete cascade,
  topic smallint not null check (topic >= 0),
  topic_text text not null,
  -- StopCard[] (@arandu/contracts), every quote checked on its page.
  cards jsonb not null check (jsonb_typeof(cards) = 'array' and jsonb_array_length(cards) > 0),
  created_at timestamptz not null default now(),
  primary key (discipline_id, topic)
);

alter table public.stop_cards enable row level security;

revoke all on public.stop_cards from anon, authenticated;

-- SlideShare (presentations uploaded by users) is now refused like Scribd: drop the cached stops that cite it.
delete from public.stop_contents s
where exists (
  select 1 from jsonb_array_elements(s.content -> 'cards') card
  where card -> 'source' ->> 'url' ~* '^https?://([a-z0-9-]+\.)*slideshare\.net([/:?#]|$)'
);
