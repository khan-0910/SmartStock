import type { Metadata } from "next";
import Link from "next/link";
import { MovementTable } from "@/components/movement-table";
import { Alert, buttonClass, Card, EmptyState, inputClass, PageHeader, Pagination } from "@/components/ui";
import { getContext } from "@/lib/auth";
import { friendlyDbError } from "@/lib/errors";
import { formatInt, qs } from "@/lib/format";
import { MOVEMENT_SELECT, PAGE_SIZE } from "@/lib/queries";
import type { Movement } from "@/lib/types";
import { isUuid, MOVEMENT_TYPES, pageNumber, safeSearchTerm } from "@/lib/validation";

export const metadata: Metadata = { title: "Movements" };

type Search = { q?: string; type?: string; from?: string; to?: string; product?: string; page?: string };

const DATE = /^\d{4}-\d{2}-\d{2}$/;

// Server-rendered per request, so "now" is the request time.
function daysAgoIso(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

export default async function MovementsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const ctx = await getContext();
  const q = safeSearchTerm(sp.q);
  const type = (MOVEMENT_TYPES as readonly string[]).includes(sp.type ?? "") ? sp.type : undefined;
  const from = sp.from && DATE.test(sp.from) ? sp.from : undefined;
  const to = sp.to && DATE.test(sp.to) ? sp.to : undefined;
  const productId = isUuid(sp.product) ? sp.product : undefined;
  const page = pageNumber(sp.page);

  // !inner on the product join lets us filter movements by product name/SKU.
  const select = q ? MOVEMENT_SELECT.replace("products!stock_movements_product_fkey(", "products!stock_movements_product_fkey!inner(") : MOVEMENT_SELECT;
  let query = ctx.supabase.from("stock_movements").select(select, { count: "exact" }).eq("workspace_id", ctx.workspace.id);
  if (type) query = query.eq("movement_type", type);
  if (productId) query = query.eq("product_id", productId);
  // Dates are interpreted as UTC days, matching how timestamps are displayed.
  if (from) query = query.gte("created_at", `${from}T00:00:00Z`);
  if (to) query = query.lt("created_at", new Date(Date.parse(`${to}T00:00:00Z`) + 86_400_000).toISOString());
  if (q) query = query.or(`name.ilike.*${q}*,sku.ilike.*${q}*`, { referencedTable: "product" });
  const weekAgo = daysAgoIso(7);
  const [{ data, count, error }, totalRes, weekRes] = await Promise.all([
    query.order("created_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
    ctx.supabase.from("stock_movements").select("id", { count: "exact", head: true }).eq("workspace_id", ctx.workspace.id),
    ctx.supabase.from("stock_movements").select("id", { count: "exact", head: true }).eq("workspace_id", ctx.workspace.id).gte("created_at", weekAgo),
  ]);

  let productName: string | undefined;
  if (productId) {
    const { data: p } = await ctx.supabase.from("products").select("name").eq("id", productId).maybeSingle();
    productName = p?.name;
  }

  const moves = (data ?? []) as unknown as Movement[];
  const filters = { q: q || undefined, type, from, to, product: productId };
  const filtered = Object.values(filters).some(Boolean);

  return (
    <>
      <PageHeader
        title="Movement history"
        kicker="Ledger"
        tone="peach"
        description="Every stock change, newest first. Records cannot be edited or deleted; corrections are new adjustments."
        stats={[
          { label: "All movements", value: formatInt(totalRes.count ?? 0) },
          { label: "Last 7 days", value: formatInt(weekRes.count ?? 0) },
          ...(filtered ? [{ label: "Matching filters", value: formatInt(count ?? 0) }] : []),
        ]}
      />

      <Card className="mb-4">
        <form role="search" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto_auto] lg:items-end">
          {productId && <input type="hidden" name="product" value={productId} />}
          <div>
            <label htmlFor="q" className="mb-1 block text-sm font-medium">
              Product
            </label>
            <input id="q" name="q" type="search" defaultValue={q} placeholder="Name or SKU" className={inputClass} />
          </div>
          <div>
            <label htmlFor="type" className="mb-1 block text-sm font-medium">
              Type
            </label>
            <select id="type" name="type" defaultValue={type ?? ""} className={inputClass}>
              <option value="">All types</option>
              <option value="stock_in">Stock in</option>
              <option value="stock_out">Stock out</option>
              <option value="adjustment">Adjustment</option>
            </select>
          </div>
          <div>
            <label htmlFor="from" className="mb-1 block text-sm font-medium">
              From (UTC)
            </label>
            <input id="from" name="from" type="date" defaultValue={from} className={inputClass} />
          </div>
          <div>
            <label htmlFor="to" className="mb-1 block text-sm font-medium">
              To (UTC)
            </label>
            <input id="to" name="to" type="date" defaultValue={to} className={inputClass} />
          </div>
          <div className="flex gap-2">
            <button type="submit" className={buttonClass("primary")}>
              Apply
            </button>
            {filtered && (
              <Link href="/movements" className={buttonClass("ghost")}>
                Clear
              </Link>
            )}
          </div>
        </form>
        {productId && (
          <p className="mt-3 text-sm text-ink/80">
            Showing movements for <strong>{productName ?? "one product"}</strong>.{" "}
            <Link href={`/movements${qs({ ...filters, product: undefined })}`} className="font-semibold text-brand-700 hover:underline">
              Show all products
            </Link>
          </p>
        )}
      </Card>

      {error ? (
        <Alert tone="error" role="alert" title="Could not load movements">
          {friendlyDbError(error, "movements")}
        </Alert>
      ) : moves.length === 0 ? (
        <EmptyState title={filtered ? "No movements match these filters" : "No movements yet"}>
          {filtered ? "Try widening the date range or clearing filters." : "Stock in, stock out and adjustments will appear here."}
        </EmptyState>
      ) : (
        <Card>
          <MovementTable movements={moves} currentUserId={ctx.user.id} />
          <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} href={(p) => `/movements${qs({ ...filters, page: p > 1 ? p : undefined })}`} />
        </Card>
      )}
    </>
  );
}
