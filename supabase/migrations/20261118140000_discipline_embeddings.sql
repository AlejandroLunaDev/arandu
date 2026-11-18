-- What each discipline is about, as a vector, so Arandu finds subjects by meaning ("gosto de biologia mas não de
-- sangue") rather than by exact words. The API embeds the discipline's name and topics (public.disciplines); the
-- person's own words are embedded only at search time and never stored. RLS on with no policies: API only.

create extension if not exists vector with schema extensions;

create table public.discipline_embeddings (
  discipline_id bigint primary key references public.disciplines (id) on delete cascade,
  -- The embedding model, e.g. 'baai/bge-m3': vectors from different models are not comparable.
  model text not null,
  -- md5 of the embedded text: a discipline whose name or topics changed is embedded again.
  content_hash text not null,
  embedding extensions.halfvec(1024) not null,
  embedded_at timestamptz not null default now()
);

-- shortcut: no HNSW index; an exact scan over the ~700 first-semester disciplines takes milliseconds and is exact.
-- Add one (halfvec_cosine_ops) past ~50k rows.

alter table public.discipline_embeddings enable row level security;

revoke all on public.discipline_embeddings from anon, authenticated;
