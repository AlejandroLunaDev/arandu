-- Plan step 3.2, from the live run: USP writes 'Letras - Bacharelado - Habilitação: Alemão' and 'Música - Bacharelado -
-- Habilitação em Flauta' where the census writes 'Letras - Alemão' and 'Música - Flauta'. The words Habilitação(ões)
-- and Ênfase only label the part after them, so the loose key drops them too. Exact names still win, and only a
-- unique match links.
create or replace function staging.loose_key(p_name text) returns text
language sql immutable set search_path = '' as $$
  select btrim(regexp_replace(
    regexp_replace(regexp_replace(staging.name_key(p_name), '[-:,()]', ' ', 'g'),
      '\m(?:com|em|de|do|da|dos|das|e|habilitacao|habilitacoes|enfase)\M', ' ', 'g'),
    '\s+', ' ', 'g'))
$$;
