-- SmartStock initial schema.
--
-- Security model (see README "Security"):
--   * Every business row carries workspace_id. RLS lets a user see a row only
--     when auth.uid() is a member of that workspace.
--   * Owners manage products and locations. Owners and staff record stock.
--   * products.quantity_on_hand and stock_movements are never written directly
--     by application roles. The only write path is record_stock_movement(),
--     which locks the product row, validates, updates the balance and appends
--     the movement in one transaction.
--   * anon has no access to any business table.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'staff')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index workspace_members_user_idx on public.workspace_members (user_id);

-- Location codes are stored upper-cased and trimmed so uniqueness is
-- case-insensitive as users expect ("a-01" and "A-01" are the same bin).
create table public.locations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  code text not null check (code = upper(btrim(code)) and char_length(code) between 1 and 32),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  description text check (description is null or char_length(description) <= 500),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint locations_workspace_code_key unique (workspace_id, code),
  -- Target for composite FKs that keep references inside one workspace.
  constraint locations_workspace_id_id_key unique (workspace_id, id)
);

-- Barcodes are text: leading zeroes matter. SKU uniqueness is
-- case-insensitive via the expression index below.
create table public.products (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  sku text not null check (sku = btrim(sku) and char_length(sku) between 1 and 64),
  barcode text check (barcode is null or (barcode = btrim(barcode) and char_length(barcode) between 1 and 64)),
  name text not null check (char_length(btrim(name)) between 1 and 200),
  description text check (description is null or char_length(description) <= 2000),
  unit text not null default 'each' check (char_length(btrim(unit)) between 1 and 20),
  cost_price numeric(12, 2) check (cost_price is null or cost_price >= 0),
  selling_price numeric(12, 2) check (selling_price is null or selling_price >= 0),
  quantity_on_hand integer not null default 0 check (quantity_on_hand between 0 and 1000000000),
  reorder_level integer not null default 0 check (reorder_level between 0 and 1000000000),
  primary_location_id uuid,
  is_active boolean not null default true,
  -- Low stock: active, has a threshold, and at or below it.
  is_low_stock boolean generated always as (
    is_active and reorder_level > 0 and quantity_on_hand <= reorder_level
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_workspace_id_id_key unique (workspace_id, id),
  constraint products_location_fkey foreign key (workspace_id, primary_location_id)
    references public.locations (workspace_id, id) on delete set null (primary_location_id)
);

create unique index products_workspace_sku_key on public.products (workspace_id, upper(sku));
create unique index products_workspace_barcode_key on public.products (workspace_id, barcode)
  where barcode is not null;
create index products_workspace_name_idx on public.products (workspace_id, name);
create index products_workspace_low_stock_idx on public.products (workspace_id) where is_low_stock;

-- Append-only ledger. product FK uses NO ACTION (not RESTRICT) so deleting a
-- whole workspace can still cascade; deleting a single product with history
-- is still rejected.
create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  product_id uuid not null,
  location_id uuid,
  movement_type text not null check (movement_type in ('stock_in', 'stock_out', 'adjustment')),
  quantity_delta integer not null check (quantity_delta <> 0),
  quantity_before integer not null check (quantity_before >= 0),
  quantity_after integer not null check (quantity_after >= 0),
  reason text not null check (char_length(btrim(reason)) between 1 and 200),
  reference text check (reference is null or char_length(reference) <= 200),
  idempotency_key uuid,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  constraint stock_movements_math_check check (quantity_after = quantity_before + quantity_delta),
  constraint stock_movements_direction_check check (
    (movement_type = 'stock_in' and quantity_delta > 0)
    or (movement_type = 'stock_out' and quantity_delta < 0)
    or movement_type = 'adjustment'
  ),
  constraint stock_movements_product_fkey foreign key (workspace_id, product_id)
    references public.products (workspace_id, id),
  constraint stock_movements_location_fkey foreign key (workspace_id, location_id)
    references public.locations (workspace_id, id) on delete set null (location_id),
  constraint stock_movements_idempotency_key unique (workspace_id, idempotency_key)
);

create index stock_movements_workspace_created_idx on public.stock_movements (workspace_id, created_at desc);
create index stock_movements_product_created_idx on public.stock_movements (workspace_id, product_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger workspaces_updated_at before update on public.workspaces
  for each row execute function public.set_updated_at();
create trigger locations_updated_at before update on public.locations
  for each row execute function public.set_updated_at();
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

-- A newly chosen primary location must be active.
create function public.check_product_location_active() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.primary_location_id is not null
     and (tg_op = 'INSERT' or new.primary_location_id is distinct from old.primary_location_id)
     and not exists (
       select 1 from public.locations l
       where l.id = new.primary_location_id and l.workspace_id = new.workspace_id and l.is_active
     ) then
    raise exception 'LOCATION_INACTIVE' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger products_location_active before insert or update of primary_location_id on public.products
  for each row execute function public.check_product_location_active();

-- Movements are immutable. Corrections are new compensating movements.
create function public.reject_movement_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'MOVEMENT_IMMUTABLE' using errcode = '42501';
end;
$$;

create trigger stock_movements_immutable before update on public.stock_movements
  for each row execute function public.reject_movement_update();

-- ---------------------------------------------------------------------------
-- Membership helpers (SECURITY DEFINER so policies do not recurse through
-- workspace_members RLS; fixed empty search_path; execute only for
-- authenticated).
-- ---------------------------------------------------------------------------

create function public.is_workspace_member(p_workspace_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = p_workspace_id and m.user_id = auth.uid()
  );
$$;

create function public.has_workspace_role(p_workspace_id uuid, p_roles text[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = p_workspace_id and m.user_id = auth.uid() and m.role = any (p_roles)
  );
$$;

-- ---------------------------------------------------------------------------
-- Privileges and RLS
-- ---------------------------------------------------------------------------

revoke all on public.workspaces, public.workspace_members, public.locations,
  public.products, public.stock_movements from anon, authenticated;

grant select on public.workspaces, public.workspace_members, public.locations,
  public.products, public.stock_movements to authenticated;

-- Column-level grants: browsers can never set quantity_on_hand, actor or
-- ownership fields, and can never move a row to another workspace.
grant update (name) on public.workspaces to authenticated;
grant insert (workspace_id, code, name, description, is_active) on public.locations to authenticated;
grant update (code, name, description, is_active) on public.locations to authenticated;
grant insert (workspace_id, sku, barcode, name, description, unit, cost_price, selling_price,
  reorder_level, primary_location_id, is_active) on public.products to authenticated;
grant update (sku, barcode, name, description, unit, cost_price, selling_price,
  reorder_level, primary_location_id, is_active) on public.products to authenticated;
-- stock_movements: no insert/update/delete grant. Writes go through
-- record_stock_movement() only.

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.locations enable row level security;
alter table public.products enable row level security;
alter table public.stock_movements enable row level security;

create policy workspaces_select on public.workspaces for select to authenticated
  using (public.is_workspace_member(id));
create policy workspaces_update on public.workspaces for update to authenticated
  using (public.has_workspace_role(id, array['owner']))
  with check (public.has_workspace_role(id, array['owner']));

create policy workspace_members_select on public.workspace_members for select to authenticated
  using (user_id = auth.uid() or public.is_workspace_member(workspace_id));

create policy locations_select on public.locations for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy locations_insert on public.locations for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner']));
create policy locations_update on public.locations for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner']))
  with check (public.has_workspace_role(workspace_id, array['owner']));

create policy products_select on public.products for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy products_insert on public.products for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner']));
create policy products_update on public.products for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner']))
  with check (public.has_workspace_role(workspace_id, array['owner']));

create policy stock_movements_select on public.stock_movements for select to authenticated
  using (public.is_workspace_member(workspace_id));

-- ---------------------------------------------------------------------------
-- ensure_workspace(): idempotent first-use setup. Returns the caller's
-- workspace, creating a personal one (with owner membership) if needed.
-- ---------------------------------------------------------------------------

create function public.ensure_workspace()
returns table (workspace_id uuid, workspace_name text, role text)
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_ws uuid;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '28000';
  end if;

  -- Serialise concurrent first requests for the same user.
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
    select w.id, w.name, m.role
    from public.workspaces w
    join public.workspace_members m on m.workspace_id = w.id and m.user_id = v_uid
    where w.id = v_ws;
end;
$$;

-- ---------------------------------------------------------------------------
-- record_stock_movement(): the only way stock changes.
--
--   stock_in    p_quantity = units received (1..1,000,000), delta = +q
--   stock_out   p_quantity = units removed  (1..1,000,000), delta = -q
--   adjustment  p_quantity = counted quantity (0..1e9), delta computed while
--               holding the row lock so a stale browser value cannot
--               overwrite intervening activity.
--
-- The product row is locked FOR UPDATE, so concurrent movements on the same
-- product serialise and cannot lose updates or go negative. Either both the
-- balance update and the movement insert commit, or neither does.
--
-- p_idempotency_key: a retried request with the same key returns the original
-- movement instead of applying it twice.
-- ---------------------------------------------------------------------------

create function public.record_stock_movement(
  p_product_id uuid,
  p_movement_type text,
  p_quantity integer,
  p_reason text,
  p_reference text default null,
  p_idempotency_key uuid default null
)
returns table (movement_id uuid, balance_before integer, balance_after integer, delta integer, replayed boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_reason text := btrim(coalesce(p_reason, ''));
  v_reference text := nullif(btrim(coalesce(p_reference, '')), '');
  v_workspace uuid;
  v_product public.products%rowtype;
  v_existing public.stock_movements%rowtype;
  v_delta integer;
  v_after integer;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '28000';
  end if;
  if p_movement_type is null or p_movement_type not in ('stock_in', 'stock_out', 'adjustment') then
    raise exception 'INVALID_MOVEMENT_TYPE' using errcode = '22023';
  end if;
  if p_quantity is null
     or (p_movement_type in ('stock_in', 'stock_out') and (p_quantity < 1 or p_quantity > 1000000))
     or (p_movement_type = 'adjustment' and (p_quantity < 0 or p_quantity > 1000000000)) then
    raise exception 'INVALID_QUANTITY' using errcode = '22023';
  end if;
  if char_length(v_reason) < 1 or char_length(v_reason) > 200 then
    raise exception 'INVALID_REASON' using errcode = '22023';
  end if;
  if v_reference is not null and char_length(v_reference) > 200 then
    raise exception 'INVALID_REFERENCE' using errcode = '22023';
  end if;

  -- Authorise before locking so outsiders cannot hold locks on other tenants' rows.
  select p.workspace_id into v_workspace from public.products p where p.id = p_product_id;
  if v_workspace is null or not public.has_workspace_role(v_workspace, array['owner', 'staff']) then
    raise exception 'PRODUCT_NOT_FOUND' using errcode = 'P0002';
  end if;

  select * into v_product from public.products p where p.id = p_product_id for update;

  if p_idempotency_key is not null then
    select * into v_existing from public.stock_movements s
    where s.workspace_id = v_workspace and s.idempotency_key = p_idempotency_key;
    if found then
      return query select v_existing.id, v_existing.quantity_before, v_existing.quantity_after,
        v_existing.quantity_delta, true;
      return;
    end if;
  end if;

  if not v_product.is_active then
    raise exception 'PRODUCT_ARCHIVED' using errcode = 'P0001';
  end if;

  v_delta := case p_movement_type
    when 'stock_in' then p_quantity
    when 'stock_out' then -p_quantity
    else p_quantity - v_product.quantity_on_hand
  end;

  if v_delta = 0 then
    raise exception 'NO_CHANGE' using errcode = 'P0001';
  end if;

  v_after := v_product.quantity_on_hand + v_delta;

  if v_after < 0 then
    raise exception 'INSUFFICIENT_STOCK'
      using errcode = 'P0001', detail = format('available=%s', v_product.quantity_on_hand);
  end if;
  if v_after > 1000000000 then
    raise exception 'QUANTITY_LIMIT' using errcode = 'P0001';
  end if;

  update public.products set quantity_on_hand = v_after where id = v_product.id;

  insert into public.stock_movements (
    workspace_id, product_id, location_id, movement_type, quantity_delta,
    quantity_before, quantity_after, reason, reference, idempotency_key, created_by
  ) values (
    v_workspace, v_product.id, v_product.primary_location_id, p_movement_type, v_delta,
    v_product.quantity_on_hand, v_after, v_reason, v_reference, p_idempotency_key, v_uid
  ) returning id into v_id;

  return query select v_id, v_product.quantity_on_hand, v_after, v_delta, false;
end;
$$;

-- ---------------------------------------------------------------------------
-- dashboard_metrics(): SECURITY INVOKER, so RLS still applies.
--   units_on_hand   sum of active quantities (mixes units; labelled as such)
--   inventory_value sum(qty * cost_price) for active products WITH a cost;
--                   products_missing_cost reports how many were excluded.
-- ---------------------------------------------------------------------------

create function public.dashboard_metrics(p_workspace_id uuid)
returns table (
  active_products bigint,
  units_on_hand bigint,
  inventory_value numeric,
  products_missing_cost bigint,
  low_stock_count bigint
)
language sql stable security invoker set search_path = '' as $$
  select
    count(*) filter (where p.is_active),
    coalesce(sum(p.quantity_on_hand) filter (where p.is_active), 0),
    coalesce(sum(p.quantity_on_hand * p.cost_price) filter (where p.is_active and p.cost_price is not null), 0),
    count(*) filter (where p.is_active and p.cost_price is null),
    count(*) filter (where p.is_low_stock)
  from public.products p
  where p.workspace_id = p_workspace_id;
$$;

-- ---------------------------------------------------------------------------
-- Function privileges
-- ---------------------------------------------------------------------------

revoke all on function public.is_workspace_member(uuid) from public, anon;
revoke all on function public.has_workspace_role(uuid, text[]) from public, anon;
revoke all on function public.ensure_workspace() from public, anon;
revoke all on function public.record_stock_movement(uuid, text, integer, text, text, uuid) from public, anon;
revoke all on function public.dashboard_metrics(uuid) from public, anon;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.check_product_location_active() from public, anon, authenticated;
revoke all on function public.reject_movement_update() from public, anon, authenticated;

grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.has_workspace_role(uuid, text[]) to authenticated;
grant execute on function public.ensure_workspace() to authenticated;
grant execute on function public.record_stock_movement(uuid, text, integer, text, text, uuid) to authenticated;
grant execute on function public.dashboard_metrics(uuid) to authenticated;
