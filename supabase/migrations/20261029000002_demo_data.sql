-- load_demo_data(): fills the caller's empty workspace with obviously
-- fictional sample data for screenshots and demos. Opening balances and
-- sample activity go through record_stock_movement(), so the demo ledger
-- obeys the same rules as real use.
--
-- Barcodes use the EAN-13 "02" prefix (reserved for in-store use) with valid
-- check digits, so they scan but never collide with real retail products.

create function public.load_demo_data() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_ws uuid;
  v_loc record;
  v_item record;
  v_product uuid;
  v_count integer := 0;
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

  if exists (select 1 from public.products p where p.workspace_id = v_ws) then
    raise exception 'WORKSPACE_NOT_EMPTY' using errcode = 'P0001';
  end if;

  for v_loc in
    select * from (values
      ('A-01-01', 'Aisle A, bay 1, shelf 1', 'Fast movers near packing'),
      ('A-01-02', 'Aisle A, bay 1, shelf 2', null),
      ('B-02-01', 'Aisle B, bay 2, shelf 1', 'Bulky items'),
      ('RCV-01', 'Receiving dock', 'Staging for inbound goods')
    ) as t (code, name, description)
  loop
    insert into public.locations (workspace_id, code, name, description)
    values (v_ws, v_loc.code, v_loc.name, v_loc.description)
    on conflict (workspace_id, code) do nothing;
  end loop;

  for v_item in
    select * from (values
      ('DEMO-MUG-001', '0200000000011', 'Ceramic mug, 350 ml', 'each', 2.40, 7.50, 12, 'A-01-01', 48),
      ('DEMO-TEA-002', '0200000000028', 'Loose-leaf tea tin, 100 g', 'each', 3.10, 8.95, 10, 'A-01-01', 6),
      ('DEMO-NBK-003', '0200000000035', 'Dot-grid notebook, A5', 'each', 1.80, 6.00, 20, 'A-01-02', 75),
      ('DEMO-PEN-004', '0200000000042', 'Gel pen, black (box of 12)', 'box', 4.50, 11.00, 5, 'A-01-02', 3),
      ('DEMO-TAP-005', '0200000000059', 'Packing tape, 48 mm', 'roll', 0.95, 2.75, 30, 'B-02-01', 120),
      ('DEMO-BOX-006', '0200000000066', 'Shipping box, medium', 'each', 0.60, null, 50, 'B-02-01', 40),
      ('DEMO-LBL-007', '0200000000073', 'Thermal labels, 100 x 150 mm', 'roll', 6.20, 14.00, 4, 'A-01-02', 9),
      ('DEMO-BAG-008', '0200000000080', 'Canvas tote bag', 'each', null, 12.00, 0, 'A-01-01', 22),
      ('DEMO-SCL-009', '0200000000097', 'Parcel scale, 30 kg', 'each', 18.00, 39.00, 2, 'RCV-01', 2),
      ('DEMO-GLV-010', '0200000000103', 'Work gloves, size M', 'pair', 1.25, 4.50, 15, 'B-02-01', 0)
    ) as t (sku, barcode, name, unit, cost_price, selling_price, reorder_level, loc_code, opening)
  loop
    insert into public.products (
      workspace_id, sku, barcode, name, unit, cost_price, selling_price, reorder_level, primary_location_id
    ) values (
      v_ws, v_item.sku, v_item.barcode, v_item.name, v_item.unit, v_item.cost_price, v_item.selling_price,
      v_item.reorder_level,
      (select l.id from public.locations l where l.workspace_id = v_ws and l.code = v_item.loc_code)
    ) returning id into v_product;

    if v_item.opening > 0 then
      perform public.record_stock_movement(v_product, 'stock_in', v_item.opening, 'Opening balance', 'Demo data');
    end if;
    v_count := v_count + 1;
  end loop;

  -- A little recent activity so history and the dashboard are not empty.
  select p.id into v_product from public.products p where p.workspace_id = v_ws and p.sku = 'DEMO-MUG-001';
  perform public.record_stock_movement(v_product, 'stock_out', 5, 'Sale', 'Demo order 1001');
  select p.id into v_product from public.products p where p.workspace_id = v_ws and p.sku = 'DEMO-TAP-005';
  perform public.record_stock_movement(v_product, 'stock_out', 24, 'Internal use', null);
  select p.id into v_product from public.products p where p.workspace_id = v_ws and p.sku = 'DEMO-NBK-003';
  perform public.record_stock_movement(v_product, 'adjustment', 73, 'Cycle count', 'Two damaged covers');

  return v_count;
end;
$$;

revoke all on function public.load_demo_data() from public, anon;
grant execute on function public.load_demo_data() to authenticated;
