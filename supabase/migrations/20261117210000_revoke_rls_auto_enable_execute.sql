-- Supabase's "auto-enable RLS" option adds public.rls_auto_enable(), a SECURITY DEFINER
-- event-trigger function that anon and authenticated can call through the REST RPC
-- (advisor lints 0028 and 0029). The event trigger keeps firing without these grants.
-- Conditional: the local stack does not create this function.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;
