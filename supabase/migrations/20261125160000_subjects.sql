-- A subject is taught once, whoever lists it (owner, 2026-11-25): every curriculum row of one name, at any institution,
-- plays the chapters of one discipline's topics, so a chapter's content is made once. Names group only when identical
-- after accents, case, punctuation, spacing and roman numerals: no word is dropped ('Bioquímica' is not 'Bioquímica
-- Celular', 'Cálculo I' is not 'Cálculo II'). Each curriculum row keeps its own name and its own discipline_id, facts of
-- its institution.

create function public.subject_key(p_name text) returns text
language sql immutable set search_path = '' as $$
  select array_to_string(array(
    select case w when 'i' then '1' when 'ii' then '2' when 'iii' then '3' when 'iv' then '4' when 'v' then '5'
      when 'vi' then '6' when 'vii' then '7' when 'viii' then '8' when 'ix' then '9' when 'x' then '10' else w end
    from unnest(regexp_split_to_array(
      trim(regexp_replace(lower(extensions.unaccent('extensions.unaccent', p_name)), '[^a-z0-9]+', ' ', 'g')), ' '))
      with ordinality as t (w, n)
    order by n), ' ')
$$;

alter table public.curriculum_subjects
  add column subject_key text generated always as (public.subject_key(name)) stored;
create index curriculum_subjects_subject_key_idx on public.curriculum_subjects (subject_key);

alter table public.disciplines
  add column subject_key text generated always as (public.subject_key(name)) stored;

-- The discipline a subject is taught from. The first one with topics keeps it, so the chapters people played and the
-- content already made stay with it across reloads.
create table public.subjects (
  key text primary key,
  discipline_id bigint not null unique references public.disciplines (id) on delete cascade
);
alter table public.subjects enable row level security;
revoke all on public.subjects from anon, authenticated;

-- Today's pick: the discipline most curriculum rows of that name link to, then the oldest.
insert into public.subjects (key, discipline_id)
select distinct on (d.subject_key) d.subject_key, d.id
from public.disciplines d
where d.topics is not null and d.subject_key <> ''
order by d.subject_key,
  (select count(*) from public.curriculum_subjects cs where cs.discipline_id = d.id) desc, d.id;

-- shortcut: a subject whose discipline later loses its topics is not handed to another one; re-pick by hand if it
-- ever happens (no source has dropped topics so far).
create function staging.claim_subject() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.topics is not null and new.subject_key <> '' then
    insert into public.subjects (key, discipline_id) values (new.subject_key, new.id) on conflict do nothing;
  end if;
  return null;
end $$;

create trigger disciplines_claim_subject after insert or update of topics, name on public.disciplines
  for each row execute function staging.claim_subject();

revoke execute on function staging.claim_subject() from public, anon, authenticated;
