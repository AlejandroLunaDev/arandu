-- Arandu's closing of a finished book (#141): written once by the model from the person's results and feeling, and
-- kept so reading it again costs nothing. Null until the book is finished and its feeling sent.
alter table public.book_reflections add column closing jsonb;
