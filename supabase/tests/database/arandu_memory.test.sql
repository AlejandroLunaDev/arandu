begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

-- Fixtures: a person, a profession to explore, and their memory, one career session and one message.
insert into auth.users (id) values ('00000000-0000-4000-8000-000000000001');
insert into public.professions (slug, name) values ('psicologia', 'Psicologia');
select lives_ok($$insert into public.arandu_memories (user_id, summary)
  values ('00000000-0000-4000-8000-000000000001', 'Gosta de lógica.')$$, 'valid memory');
select lives_ok($$insert into public.arandu_sessions (id, user_id, kind, profession_slug)
  values ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000001', 'career', 'psicologia')$$,
  'valid career session');
select lives_ok($$insert into public.arandu_sessions (id, user_id, kind)
  values ('00000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-000000000001', 'onboarding')$$,
  'valid onboarding session');
select lives_ok($$insert into public.arandu_messages (session_id, role, content)
  values ('00000000-0000-4000-8000-0000000000a1', 'user', 'Oi')$$, 'valid message');

-- Constraint violations.
select throws_ok($$update public.arandu_memories set summary = repeat('a', 1501)$$, '23514', null,
  'summary over 1500 chars');
select lives_ok($$update public.arandu_memories set summary = repeat('a', 1500)$$, 'summary of exactly 1500 chars');
select throws_ok($$insert into public.arandu_sessions (user_id, kind)
  values ('00000000-0000-4000-8000-000000000001', 'career')$$, '23514', null,
  'career session without profession_slug');
select throws_ok($$insert into public.arandu_sessions (user_id, kind, profession_slug)
  values ('00000000-0000-4000-8000-000000000001', 'onboarding', 'psicologia')$$, '23514', null,
  'onboarding session with a profession_slug');
select throws_ok($$insert into public.arandu_messages (session_id, role, content)
  values ('00000000-0000-4000-8000-0000000000a1', 'system', 'Oi')$$, '23514', null,
  'message with an unknown role');

-- RLS is on and the API roles read nothing.
select is(
  (select count(*)::int from pg_class
   where oid in ('public.arandu_memories'::regclass, 'public.arandu_sessions'::regclass,
                 'public.arandu_messages'::regclass)
     and relrowsecurity),
  3, 'RLS enabled on the 3 tables');

set local role anon;
select throws_ok($$select * from public.arandu_memories$$, '42501', null, 'anon cannot select memories');
reset role;
set local role authenticated;
select throws_ok($$select * from public.arandu_sessions$$, '42501', null, 'authenticated cannot select sessions');
select throws_ok($$select * from public.arandu_messages$$, '42501', null, 'authenticated cannot select messages');
reset role;

-- Deleting the account removes everything.
delete from auth.users where id = '00000000-0000-4000-8000-000000000001';
select is(
  (select (select count(*) from public.arandu_memories) + (select count(*) from public.arandu_sessions)
        + (select count(*) from public.arandu_messages))::int,
  0, 'deleting the user cascades to memory, sessions and messages');

select * from finish();
rollback;
