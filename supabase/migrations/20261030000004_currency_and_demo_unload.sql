-- 1) Workspace currency: how prices and inventory value are displayed.
--    Amounts are stored as plain numbers; changing the currency does not
--    convert them.
-- 2) unload_demo_data(): removes what load_demo_data() added.

alter table public.workspaces
  add column currency text not null default 'USD'
  check (currency in ('USD', 'EUR', 'GBP', 'JPY', 'INR', 'SGD'));

grant update (currency) on public.workspaces to authenticated;

-- ensure_workspace() now also returns the currency (return type change
-- needs drop + create).
drop function public.ensure_workspace();

create function public.ensure_workspace()
returns table (workspace_id uuid, workspace_name text, role text, currency text)
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_ws uuid;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '28000';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));

  select m.workspace_id into v_ws
  from public.workspace_members m
  where m.user_id = v_uid
  order by m.created_at
  limit 1;

  if v_ws is null then
    insert into public.workspaces (name, created_by) values ('My workspace', v_uid)
      returning id into v_ws;
    insert into public.workspace_members (workspace_id, user_id, role) values (v_ws, v_uid, 'owner');
  end if;

  return query
    select w.id, w.name, m.role, w.currency
    from public.workspaces w
    join public.workspace_members m on m.workspace_id = w.id and m.user_id = v_uid
    where w.id = v_ws;
end;
$$;

revoke all on function public.ensure_workspace() from public, anon;
grant execute on function public.ensure_workspace() to authenticated;

-- unload_demo_data(): deletes the demo products (matched by their exact
-- demo SKUs), their movements, and the demo locations (matched by code AND
-- demo name) once nothing references them. The owner's own products and
-- locations are never touched. Returns the number of products removed.
create function public.unload_demo_data() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_ws uuid;
  v_count integer;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '28000';
  end if;

  select m.workspace_id into v_ws from public.workspace_members m
  where m.user_id = v_uid and m.role = 'owner'
  order by m.created_at limit 1;
  if v_ws is null then
    raise exception 'PERMISSION_DENIED' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_ws::text, 1));

  create temporary table demo_products on commit drop as
    select p.id from public.products p
    where p.workspace_id = v_ws
      and p.sku in ('DEMO-MUG-001', 'DEMO-TEA-002', 'DEMO-NBK-003', 'DEMO-PEN-004', 'DEMO-TAP-005',
                    'DEMO-BOX-006', 'DEMO-LBL-007', 'DEMO-BAG-008', 'DEMO-SCL-009', 'DEMO-GLV-010');

  -- History of demo products goes with them (movements are otherwise immutable).
  delete from public.stock_movements s where s.workspace_id = v_ws and s.product_id in (select id from demo_products);
  delete from public.products p where p.id in (select id from demo_products);
  get diagnostics v_count = row_count;

  delete from public.locations l
  where l.workspace_id = v_ws
    and (l.code, l.name) in (
      ('A-01-01', 'Aisle A, bay 1, shelf 1'),
      ('A-01-02', 'Aisle A, bay 1, shelf 2'),
      ('B-02-01', 'Aisle B, bay 2, shelf 1'),
      ('RCV-01', 'Receiving dock')
    )
    and not exists (select 1 from public.products p where p.primary_location_id = l.id)
    and not exists (select 1 from public.stock_movements s where s.location_id = l.id);

  return v_count;
end;
$$;

revoke all on function public.unload_demo_data() from public, anon;
grant execute on function public.unload_demo_data() to authenticated;
