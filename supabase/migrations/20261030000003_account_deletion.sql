-- delete_my_account(): lets a signed-in user permanently erase their account
-- (privacy "right to erasure").
--
-- Deletes every workspace the caller owns (cascading to members, locations,
-- products and the full movement history of those workspaces), then the
-- caller's auth user. Refuses when the caller recorded movements in a
-- workspace they do not own: that history belongs to the other owner, so the
-- owner has to remove them first.
--
-- SECURITY DEFINER: runs as the migration owner (postgres on Supabase), which
-- may delete from auth.users. It only ever acts on auth.uid().

create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '28000';
  end if;

  if exists (
    select 1 from public.stock_movements s
    join public.workspace_members m on m.workspace_id = s.workspace_id and m.user_id = v_uid
    where s.created_by = v_uid and m.role <> 'owner'
  ) then
    raise exception 'HAS_SHARED_HISTORY' using errcode = 'P0001';
  end if;

  -- Statement-level: the movement immutability trigger only blocks UPDATE,
  -- and the cascade from workspaces removes history together with its workspace.
  delete from public.workspaces w
  where exists (
    select 1 from public.workspace_members m
    where m.workspace_id = w.id and m.user_id = v_uid and m.role = 'owner'
  );

  delete from public.workspace_members where user_id = v_uid;
  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
