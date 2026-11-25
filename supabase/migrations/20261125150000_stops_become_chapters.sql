-- A subject's topics are chapters, each played as lessons; "stop" leaves the product (owner, 2026-11-25). The tables,
-- their constraints and indexes, and the facts' source take the new name. Nothing else in the database names a stop.

do $$
declare
  t text;
  r record;
begin
  foreach t in array array['contents', 'cards', 'results', 'questions', 'rereads'] loop
    execute format('alter table public.%I rename to %I', 'stop_' || t, 'chapter_' || t);
  end loop;

  for r in
    select c.conrelid::regclass as tbl, c.conname from pg_constraint c
    join pg_namespace n on n.oid = c.connamespace
    where n.nspname = 'public' and c.conname like 'stop\_%' and c.contype <> 'p'
  loop
    execute format('alter table %s rename constraint %I to %I', r.tbl, r.conname, 'chapter_' || substr(r.conname, 6));
  end loop;

  -- Primary keys rename with their index.
  for r in select indexname from pg_indexes where schemaname = 'public' and indexname like 'stop\_%' loop
    execute format('alter index public.%I rename to %I', r.indexname, 'chapter_' || substr(r.indexname, 6));
  end loop;
end $$;

alter table public.arandu_facts drop constraint arandu_facts_source_check;
update public.arandu_facts set source = 'chapter' where source = 'stop';
alter table public.arandu_facts
  add constraint arandu_facts_source_check check (source in ('onboarding', 'chapter', 'conversation'));
