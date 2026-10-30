import { beforeAll, describe, expect, it } from "vitest";
import { as, createDb, createUser, type Db } from "./harness";

const ALICE = "00000000-0000-4000-8000-00000000000a";
const BOB = "00000000-0000-4000-8000-00000000000b";

let db: Db;
let aliceWs: string;
let bobWs: string;

async function rows<T>(sql: string, params: unknown[] = []) {
  return (await db.query<T>(sql, params)).rows;
}

async function newProduct(userId: string, ws: string, sku: string, extra: Record<string, unknown> = {}) {
  return as(db, userId, async () => {
    const cols = ["workspace_id", "sku", "name", ...Object.keys(extra)];
    const vals = [ws, sku, `Product ${sku}`, ...Object.values(extra)];
    const ph = vals.map((_, i) => `$${i + 1}`).join(", ");
    const [row] = await rows<{ id: string }>(`insert into public.products (${cols.join(", ")}) values (${ph}) returning id`, vals);
    return row.id;
  });
}

type MoveResult = { movement_id: string; balance_before: number; balance_after: number; delta: number; replayed: boolean };

function move(userId: string, productId: string, type: string, qty: number, reason = "Test", key: string | null = null) {
  return as(db, userId, async () => {
    const [row] = await rows<MoveResult>(
      "select * from public.record_stock_movement($1, $2, $3, $4, null, $5)",
      [productId, type, qty, reason, key],
    );
    return row;
  });
}

async function qty(productId: string) {
  const [row] = await rows<{ quantity_on_hand: number }>("select quantity_on_hand from public.products where id = $1", [productId]);
  return row.quantity_on_hand;
}

async function movementCount(productId: string) {
  const [row] = await rows<{ n: number }>("select count(*)::int as n from public.stock_movements where product_id = $1", [productId]);
  return row.n;
}

beforeAll(async () => {
  db = await createDb();
  await createUser(db, ALICE);
  await createUser(db, BOB);
  aliceWs = await as(db, ALICE, async () => (await rows<{ workspace_id: string }>("select * from public.ensure_workspace()"))[0].workspace_id);
  bobWs = await as(db, BOB, async () => (await rows<{ workspace_id: string }>("select * from public.ensure_workspace()"))[0].workspace_id);
}, 60_000);

describe("workspace setup", () => {
  it("is idempotent and makes the caller owner", async () => {
    const again = await as(db, ALICE, () => rows<{ workspace_id: string; role: string }>("select * from public.ensure_workspace()"));
    expect(again[0].workspace_id).toBe(aliceWs);
    expect(again[0].role).toBe("owner");
    const [{ n }] = await rows<{ n: number }>("select count(*)::int as n from public.workspace_members where user_id = $1", [ALICE]);
    expect(n).toBe(1);
  });

  it("rejects anonymous callers", async () => {
    await expect(as(db, null, () => rows("select * from public.ensure_workspace()"))).rejects.toThrow();
  });
});

describe("stock movements", () => {
  it("stock-in increases quantity and writes exactly one matching movement", async () => {
    const p = await newProduct(ALICE, aliceWs, "IN-1");
    const r = await move(ALICE, p, "stock_in", 10);
    expect(r).toMatchObject({ balance_before: 0, balance_after: 10, delta: 10, replayed: false });
    expect(await qty(p)).toBe(10);
    const m = await rows<{ quantity_delta: number; quantity_before: number; quantity_after: number; created_by: string }>(
      "select * from public.stock_movements where product_id = $1",
      [p],
    );
    expect(m).toHaveLength(1);
    expect(m[0]).toMatchObject({ quantity_delta: 10, quantity_before: 0, quantity_after: 10, created_by: ALICE });
  });

  it("stock-out decreases quantity with a negative delta", async () => {
    const p = await newProduct(ALICE, aliceWs, "OUT-1");
    await move(ALICE, p, "stock_in", 10);
    const r = await move(ALICE, p, "stock_out", 4);
    expect(r).toMatchObject({ balance_before: 10, balance_after: 6, delta: -4 });
    expect(await qty(p)).toBe(6);
    expect(await movementCount(p)).toBe(2);
  });

  it("rejects stock-out below zero and changes nothing", async () => {
    const p = await newProduct(ALICE, aliceWs, "OUT-2");
    await move(ALICE, p, "stock_in", 3);
    await expect(move(ALICE, p, "stock_out", 4)).rejects.toThrow(/INSUFFICIENT_STOCK/);
    expect(await qty(p)).toBe(3);
    expect(await movementCount(p)).toBe(1);
  });

  it("adjustment sets the counted quantity and records the signed delta", async () => {
    const p = await newProduct(ALICE, aliceWs, "ADJ-1");
    await move(ALICE, p, "stock_in", 20);
    const down = await move(ALICE, p, "adjustment", 17, "Cycle count");
    expect(down).toMatchObject({ balance_before: 20, balance_after: 17, delta: -3 });
    const up = await move(ALICE, p, "adjustment", 25, "Found stock");
    expect(up).toMatchObject({ balance_before: 17, balance_after: 25, delta: 8 });
    await expect(move(ALICE, p, "adjustment", 25, "Same")).rejects.toThrow(/NO_CHANGE/);
    expect(await qty(p)).toBe(25);
  });

  it("validates quantity and reason", async () => {
    const p = await newProduct(ALICE, aliceWs, "VAL-1");
    await expect(move(ALICE, p, "stock_in", 0)).rejects.toThrow(/INVALID_QUANTITY/);
    await expect(move(ALICE, p, "stock_in", -5)).rejects.toThrow(/INVALID_QUANTITY/);
    await expect(move(ALICE, p, "stock_in", 1_000_001)).rejects.toThrow(/INVALID_QUANTITY/);
    await expect(move(ALICE, p, "adjustment", -1)).rejects.toThrow(/INVALID_QUANTITY/);
    await expect(move(ALICE, p, "stock_in", 1, "   ")).rejects.toThrow(/INVALID_REASON/);
    await expect(move(ALICE, p, "teleport", 1)).rejects.toThrow(/INVALID_MOVEMENT_TYPE/);
    expect(await movementCount(p)).toBe(0);
  });

  it("replays a retried request with the same idempotency key", async () => {
    const p = await newProduct(ALICE, aliceWs, "IDEM-1");
    const key = "11111111-1111-4111-8111-111111111111";
    const first = await move(ALICE, p, "stock_in", 5, "Received", key);
    const second = await move(ALICE, p, "stock_in", 5, "Received", key);
    expect(second.replayed).toBe(true);
    expect(second.movement_id).toBe(first.movement_id);
    expect(await qty(p)).toBe(5);
    expect(await movementCount(p)).toBe(1);
  });

  it("rejects movements on archived products", async () => {
    const p = await newProduct(ALICE, aliceWs, "ARC-1");
    await as(db, ALICE, () => rows("update public.products set is_active = false where id = $1", [p]));
    await expect(move(ALICE, p, "stock_in", 1)).rejects.toThrow(/PRODUCT_ARCHIVED/);
  });

  it("rolls back the balance update when the movement insert fails", async () => {
    const p = await newProduct(ALICE, aliceWs, "TX-1");
    await move(ALICE, p, "stock_in", 5);
    // Force the insert to fail after the update has run inside the function.
    await db.exec(`
      create function public.fail_insert() returns trigger language plpgsql as $$
      begin raise exception 'BOOM'; end $$;
      create trigger fail_insert before insert on public.stock_movements
        for each row execute function public.fail_insert();
    `);
    try {
      await expect(move(ALICE, p, "stock_in", 3)).rejects.toThrow(/BOOM/);
    } finally {
      await db.exec("drop trigger fail_insert on public.stock_movements; drop function public.fail_insert();");
    }
    expect(await qty(p)).toBe(5);
    expect(await movementCount(p)).toBe(1);
  });

  it("does not let the client write quantity or movements directly", async () => {
    const p = await newProduct(ALICE, aliceWs, "DIRECT-1");
    await expect(as(db, ALICE, () => rows("update public.products set quantity_on_hand = 99 where id = $1", [p]))).rejects.toThrow(
      /permission denied/,
    );
    await expect(
      as(db, ALICE, () =>
        rows(
          `insert into public.stock_movements (workspace_id, product_id, movement_type, quantity_delta, quantity_before, quantity_after, reason, created_by)
           values ($1, $2, 'stock_in', 5, 0, 5, 'x', $3)`,
          [aliceWs, p, ALICE],
        ),
      ),
    ).rejects.toThrow(/permission denied/);
    await move(ALICE, p, "stock_in", 1);
    await expect(as(db, ALICE, () => rows("delete from public.stock_movements where product_id = $1", [p]))).rejects.toThrow(
      /permission denied/,
    );
    await expect(as(db, ALICE, () => rows("update public.stock_movements set reason = 'edited' where product_id = $1", [p]))).rejects.toThrow(
      /permission denied/,
    );
    // Even the table owner cannot edit history.
    await expect(rows("update public.stock_movements set reason = 'edited' where product_id = $1", [p])).rejects.toThrow(/MOVEMENT_IMMUTABLE/);
  });
});

describe("tenant isolation", () => {
  it("hides other workspaces' rows", async () => {
    const p = await newProduct(BOB, bobWs, "BOB-1");
    await move(BOB, p, "stock_in", 2);
    const seen = await as(db, ALICE, () => rows("select id from public.products where id = $1", [p]));
    expect(seen).toHaveLength(0);
    const moves = await as(db, ALICE, () => rows("select id from public.stock_movements where product_id = $1", [p]));
    expect(moves).toHaveLength(0);
    const ws = await as(db, ALICE, () => rows("select id from public.workspaces where id = $1", [bobWs]));
    expect(ws).toHaveLength(0);
  });

  it("blocks stock changes and edits on another workspace's product", async () => {
    const p = await newProduct(BOB, bobWs, "BOB-2");
    await move(BOB, p, "stock_in", 2);
    await expect(move(ALICE, p, "stock_out", 1)).rejects.toThrow(/PRODUCT_NOT_FOUND/);
    await as(db, ALICE, () => rows("update public.products set name = 'hacked' where id = $1", [p]));
    const [row] = await rows<{ name: string; quantity_on_hand: number }>("select name, quantity_on_hand from public.products where id = $1", [p]);
    expect(row).toEqual({ name: "Product BOB-2", quantity_on_hand: 2 });
  });

  it("blocks inserting into another workspace", async () => {
    await expect(newProduct(ALICE, bobWs, "SNEAK-1")).rejects.toThrow(/row-level security/);
  });

  it("blocks linking a product to another workspace's location", async () => {
    const [loc] = await as(db, BOB, () =>
      rows<{ id: string }>("insert into public.locations (workspace_id, code, name) values ($1, 'BOB-LOC', 'Bob bin') returning id", [bobWs]),
    );
    await expect(newProduct(ALICE, aliceWs, "XLOC-1", { primary_location_id: loc.id })).rejects.toThrow();
  });

  it("gives anonymous users nothing", async () => {
    for (const table of ["workspaces", "workspace_members", "locations", "products", "stock_movements"]) {
      await expect(as(db, null, () => rows(`select * from public.${table}`))).rejects.toThrow(/permission denied/);
    }
  });
});

describe("constraints", () => {
  it("enforces case-insensitive SKU uniqueness per workspace", async () => {
    await newProduct(ALICE, aliceWs, "Dup-Sku");
    await expect(newProduct(ALICE, aliceWs, "DUP-SKU")).rejects.toThrow(/products_workspace_sku_key/);
    // Same SKU in another workspace is fine.
    await expect(newProduct(BOB, bobWs, "DUP-SKU")).resolves.toBeTruthy();
  });

  it("enforces barcode uniqueness and keeps leading zeroes", async () => {
    const p = await newProduct(ALICE, aliceWs, "BC-1", { barcode: "0012345678905" });
    const [row] = await rows<{ barcode: string }>("select barcode from public.products where id = $1", [p]);
    expect(row.barcode).toBe("0012345678905");
    await expect(newProduct(ALICE, aliceWs, "BC-2", { barcode: "0012345678905" })).rejects.toThrow(/products_workspace_barcode_key/);
  });

  it("rejects an inactive location for a product", async () => {
    const [loc] = await as(db, ALICE, () =>
      rows<{ id: string }>("insert into public.locations (workspace_id, code, name, is_active) values ($1, 'OLD-1', 'Old', false) returning id", [aliceWs]),
    );
    await expect(newProduct(ALICE, aliceWs, "LOC-1", { primary_location_id: loc.id })).rejects.toThrow(/LOCATION_INACTIVE/);
  });

  it("flags low stock only for active products with a threshold", async () => {
    const low = await newProduct(ALICE, aliceWs, "LOW-1", { reorder_level: 5 });
    await move(ALICE, low, "stock_in", 5);
    const none = await newProduct(ALICE, aliceWs, "LOW-2", { reorder_level: 0 });
    const [a] = await rows<{ is_low_stock: boolean }>("select is_low_stock from public.products where id = $1", [low]);
    const [b] = await rows<{ is_low_stock: boolean }>("select is_low_stock from public.products where id = $1", [none]);
    expect(a.is_low_stock).toBe(true);
    expect(b.is_low_stock).toBe(false);
  });
});

describe("account deletion", () => {
  it("erases the caller, their workspace and its history, and nothing else", async () => {
    const DAVE = "00000000-0000-4000-8000-00000000000d";
    await createUser(db, DAVE);
    const ws = await as(db, DAVE, async () => (await rows<{ workspace_id: string }>("select * from public.ensure_workspace()"))[0].workspace_id);
    const p = await newProduct(DAVE, ws, "DAVE-1");
    await move(DAVE, p, "stock_in", 3);
    const [{ before }] = await rows<{ before: number }>("select count(*)::int as before from public.products where workspace_id = $1", [bobWs]);

    await as(db, DAVE, () => rows("select public.delete_my_account()"));

    const left = await rows(
      `select 1 from auth.users where id = $1
       union all select 1 from public.workspaces where id = $2
       union all select 1 from public.products where workspace_id = $2
       union all select 1 from public.stock_movements where workspace_id = $2`,
      [DAVE, ws],
    );
    expect(left).toHaveLength(0);
    const [{ after }] = await rows<{ after: number }>("select count(*)::int as after from public.products where workspace_id = $1", [bobWs]);
    expect(after).toBe(before);
  });

  it("is not callable anonymously", async () => {
    await expect(as(db, null, () => rows("select public.delete_my_account()"))).rejects.toThrow(/permission denied/);
  });
});

describe("currency", () => {
  it("defaults to USD, can be changed by the owner, and only to supported codes", async () => {
    const [ws] = await as(db, ALICE, () => rows<{ currency: string }>("select * from public.ensure_workspace()"));
    expect(ws.currency).toBe("USD");
    await as(db, ALICE, () => rows("update public.workspaces set currency = 'JPY' where id = $1", [aliceWs]));
    const [after] = await as(db, ALICE, () => rows<{ currency: string }>("select * from public.ensure_workspace()"));
    expect(after.currency).toBe("JPY");
    await expect(as(db, ALICE, () => rows("update public.workspaces set currency = 'XYZ' where id = $1", [aliceWs]))).rejects.toThrow();
    await as(db, ALICE, () => rows("update public.workspaces set currency = 'USD' where id = $1", [aliceWs]));
  });
});

describe("price entry currency", () => {
  it("records the entry currency and rate, and rejects bad combinations", async () => {
    const p = await newProduct(ALICE, aliceWs, "FX-1", { cost_price: "13.13", price_currency: "INR", price_fx_rate: "95.27" });
    const [row] = await rows<{ cost_price: string; price_currency: string; price_fx_rate: string }>(
      "select cost_price::text, price_currency, price_fx_rate::text from public.products where id = $1",
      [p],
    );
    expect(row).toEqual({ cost_price: "13.13", price_currency: "INR", price_fx_rate: "95.27000000" });
    await expect(newProduct(ALICE, aliceWs, "FX-2", { price_currency: "XYZ" })).rejects.toThrow();
    await expect(newProduct(ALICE, aliceWs, "FX-3", { price_currency: "USD", price_fx_rate: "2" })).rejects.toThrow(/products_usd_rate_check/);
  });
});

describe("unload demo data", () => {
  it("removes demo products, their history and unused demo locations, and nothing else", async () => {
    const ERIN = "00000000-0000-4000-8000-00000000000e";
    await createUser(db, ERIN);
    const ws = await as(db, ERIN, async () => (await rows<{ workspace_id: string }>("select * from public.ensure_workspace()"))[0].workspace_id);
    await as(db, ERIN, () => rows("select public.load_demo_data()"));
    // The owner's own product and location (added after the demo) must survive.
    const mine = await newProduct(ERIN, ws, "MY-OWN-1");
    await move(ERIN, mine, "stock_in", 7);
    await as(db, ERIN, () => rows("insert into public.locations (workspace_id, code, name) values ($1, 'MY-BIN', 'My bin')", [ws]));

    const [{ unload_demo_data }] = await as(db, ERIN, () => rows<{ unload_demo_data: number }>("select public.unload_demo_data()"));
    expect(unload_demo_data).toBe(10);

    const products = await rows<{ sku: string }>("select sku from public.products where workspace_id = $1", [ws]);
    expect(products.map((p) => p.sku)).toEqual(["MY-OWN-1"]);
    const locs = await rows<{ code: string }>("select code from public.locations where workspace_id = $1", [ws]);
    expect(locs.map((l) => l.code)).toEqual(["MY-BIN"]);
    expect(await movementCount(mine)).toBe(1);
    // Can load again afterwards? No: the workspace still has a product (by design).
    await expect(as(db, ERIN, () => rows("select public.load_demo_data()"))).rejects.toThrow(/WORKSPACE_NOT_EMPTY/);
  });

  it("is not callable anonymously", async () => {
    await expect(as(db, null, () => rows("select public.unload_demo_data()"))).rejects.toThrow(/permission denied/);
  });
});

describe("demo data", () => {
  it("loads once into an empty workspace through the ledger", async () => {
    const CAROL = "00000000-0000-4000-8000-00000000000c";
    await createUser(db, CAROL);
    const ws = await as(db, CAROL, async () => (await rows<{ workspace_id: string }>("select * from public.ensure_workspace()"))[0].workspace_id);
    const [{ load_demo_data }] = await as(db, CAROL, () => rows<{ load_demo_data: number }>("select public.load_demo_data()"));
    expect(load_demo_data).toBe(10);
    await expect(as(db, CAROL, () => rows("select public.load_demo_data()"))).rejects.toThrow(/WORKSPACE_NOT_EMPTY/);
    // Ledger and balances agree for every product.
    const mismatches = await rows(
      `select p.id from public.products p
       left join public.stock_movements m on m.product_id = p.id
       where p.workspace_id = $1
       group by p.id, p.quantity_on_hand
       having p.quantity_on_hand <> coalesce(sum(m.quantity_delta), 0)`,
      [ws],
    );
    expect(mismatches).toHaveLength(0);
    const [metrics] = await as(db, CAROL, () =>
      rows<{ active_products: number; low_stock_count: number; products_missing_cost: number }>(
        "select * from public.dashboard_metrics($1)",
        [ws],
      ),
    );
    expect(Number(metrics.active_products)).toBe(10);
    expect(Number(metrics.products_missing_cost)).toBe(1);
    expect(Number(metrics.low_stock_count)).toBeGreaterThan(0);
  });
});
