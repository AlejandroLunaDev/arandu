-- Stops cached before the quote check refused these hosts in code: sites of documents uploaded by users and
-- placeholder domains. Deleting them makes the next visit generate them again from an accepted source.

delete from public.stop_contents s
where exists (
  select 1 from jsonb_array_elements(s.content -> 'cards') card
  where card -> 'source' ->> 'url'
    ~* '^https?://([a-z0-9-]+\.)*(scribd\.com|passeidireto\.com|brainly\.[a-z.]+|studocu\.com|example\.(com|org|net))([/:?#]|$)'
);
