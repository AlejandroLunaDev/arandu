-- The brand is now just "Arandu" (owner, 2026-11-19): "Arandu Reka" goes away everywhere. It appears in one stored text,
-- the product book's opening paragraph; the rest of the owner's approved text stays word for word. Sentences where
-- "Arandu" names the cat were already "Arandu" and are untouched.
update public.story_facts
set text = replace(text, 'O Arandu Reka é um app', 'O Arandu é um app')
where book = 'produto' and page = 1 and position = 1;

do $$
begin
  if exists (select 1 from public.story_facts where text like '%Arandu Reka%' or figure like '%Arandu Reka%'
               or source_label like '%Arandu Reka%') then
    raise exception 'a stored text still says "Arandu Reka"';
  end if;
end $$;
