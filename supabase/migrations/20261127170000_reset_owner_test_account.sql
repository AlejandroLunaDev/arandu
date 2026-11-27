-- Deletes the owner's test account and all its data (owner, 2026-11-27), the way DELETE /me does: its journey kept
-- the subject the name match chose before #157 (Psicologia's statistics book was Medicina Veterinária's MAE0110), so the
-- owner tests the demo again from a clean start. Every table keyed by the user goes with it (on delete cascade).

delete from auth.users where id in (
  select i.user_id from auth.identities i join public.users u on u.google_sub = i.provider_id
  where u.id = 'd028b298-7277-4654-9338-0a8fe73ecd4f' and i.provider = 'google');

delete from public.users where id = 'd028b298-7277-4654-9338-0a8fe73ecd4f';
