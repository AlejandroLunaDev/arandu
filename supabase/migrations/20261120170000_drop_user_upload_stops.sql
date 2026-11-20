-- Stops cached before #72 could cite sites of documents uploaded by users (Scribd and similar), which the stop prompt
-- now excludes as sources. Deleting them makes the next visit generate them again from an accepted source.

delete from public.stop_contents s
where exists (
  select 1 from jsonb_array_elements(s.content -> 'cards') card
  where card -> 'source' ->> 'url'
    ~* '^https?://([a-z0-9-]+\.)*(scribd\.com|passeidireto\.com|brainly\.com(\.br)?|studocu\.com)(/|$)'
);
