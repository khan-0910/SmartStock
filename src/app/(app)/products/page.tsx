import type { Metadata } from "next";
import Link from "next/link";
import { Alert, buttonClass, Card, EmptyState, inputClass, LinkButton, LowStockBadge, PageHeader, Pagination, StatusBadge } from "@/components/ui";
import { getContext } from "@/lib/auth";
import { friendlyDbError } from "@/lib/errors";
import { formatInt, qs } from "@/lib/format";
import { PAGE_SIZE, PRODUCT_SELECT } from "@/lib/queries";
import type { ProductWithLocation } from "@/lib/types";
import { isUuid, pageNumber, safeSearchTerm } from "@/lib/validation";

export const metadata: Metadata = { title: "Products" };

type Search = { q?: string; status?: string; stock?: string; location?: string; page?: string };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const { supabase, workspace } = await getContext();
  const q = safeSearchTerm(sp.q);
  const status = sp.status === "archived" || sp.status === "all" ? sp.status : "active";
  const lowOnly = sp.stock === "low";
  const locationId = isUuid(sp.location) ? sp.location : undefined;
  const page = pageNumber(sp.page);

  let query = supabase.from("products").select(PRODUCT_SELECT, { count: "exact" }).eq("workspace_id", workspace.id);
  if (status !== "all") query = query.eq("is_active", status === "active");
  if (lowOnly) query = query.eq("is_low_stock", true);
  if (locationId) query = query.eq("primary_location_id", locationId);
  if (q) query = query.or(`name.ilike.*${q}*,sku.ilike.*${q}*,barcode.ilike.*${q}*`);
  const { data, count, error } = await query.order("name").range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const products = (data ?? []) as ProductWithLocation[];
  const filters = { q: q || undefined, status: status === "active" ? undefined : status, stock: lowOnly ? "low" : undefined, location: locationId };
  const listQuery = qs({ ...filters, page: page > 1 ? page : undefined });
  const filtered = !!(q || lowOnly || locationId || status !== "active");
  const locationCode = locationId && products[0]?.location?.code;

  return (
    <>
      <PageHeader
        title="Products" kicker="Catalog"
        description="Search by name, SKU or barcode."
        actions={
          <>
            <LinkButton href="/scan" variant="secondary">
              Scan
            </LinkButton>
            <LinkButton href="/products/new">Add product</LinkButton>
          </>
        }
      />

      <Card className="mb-4">
        <form role="search" className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
          {locationId && <input type="hidden" name="location" value={locationId} />}
          <div>
            <label htmlFor="q" className="mb-1 block text-sm font-medium">
              Search
            </label>
            <input id="q" name="q" type="search" defaultValue={q} placeholder="Name, SKU or barcode" className={inputClass} />
          </div>
          <div>
            <label htmlFor="status" className="mb-1 block text-sm font-medium">
              Status
            </label>
            <select id="status" name="status" defaultValue={status} className={inputClass}>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="all">All</option>
            </select>
          </div>
          <label className="flex min-h-10 items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="stock" value="low" defaultChecked={lowOnly} className="size-4" />
            Low stock only
          </label>
          <div className="flex gap-2">
            <button type="submit" className={buttonClass("primary")}>
              Apply
            </button>
            {filtered && (
              <Link href="/products" className={buttonClass("ghost")}>
                Clear
              </Link>
            )}
          </div>
        </form>
        {locationId && (
          <p className="mt-3 text-sm text-ink/80">
            Showing products stored at <strong>{locationCode ?? "one location"}</strong>.{" "}
            <Link href={`/products${qs({ ...filters, location: undefined })}`} className="font-semibold text-brand-700 hover:underline">
              Show all locations
            </Link>
          </p>
        )}
      </Card>

      {error ? (
        <Alert tone="error" role="alert" title="Could not load products">
          {friendlyDbError(error, "products")}
        </Alert>
      ) : products.length === 0 ? (
        filtered ? (
          <EmptyState title="No matching products" actions={<LinkButton href="/products" variant="secondary">Clear filters</LinkButton>}>
            Try a different search or filter.
          </EmptyState>
        ) : (
          <EmptyState title="No products yet" actions={<LinkButton href="/products/new">Add your first product</LinkButton>}>
            Products hold your SKU, barcode, price, reorder level and storage location.
          </EmptyState>
        )
      ) : (
        <Card className="p-0 sm:p-0">
          <ProductList products={products} back={`/products${listQuery}`} />
          <div className="px-4 pb-4">
            <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} href={(p) => `/products${qs({ ...filters, page: p > 1 ? p : undefined })}`} />
          </div>
        </Card>
      )}
    </>
  );
}

function ProductList({ products, back }: { products: ProductWithLocation[]; back: string }) {
  const href = (id: string) => `/products/${id}${back !== "/products" ? qs({ back }) : ""}`;
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Products</caption>
          <thead className="border-b border-ink/10 text-xs uppercase tracking-wide text-ink/60">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Product</th>
              <th scope="col" className="px-4 py-3 font-medium">Barcode</th>
              <th scope="col" className="px-4 py-3 font-medium">Location</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">On hand</th>
              <th scope="col" className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {products.map((p) => (
              <tr key={p.id} className="transition-colors duration-200 hover:bg-lime/25">
                <td className="px-4 py-3">
                  <Link href={href(p.id)} className="font-medium text-ink hover:underline">
                    {p.name}
                  </Link>
                  <div className="text-xs text-ink/60">SKU {p.sku}</div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-ink/80">{p.barcode ?? "—"}</td>
                <td className="px-4 py-3 text-ink/80">{p.location?.code ?? "—"}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  <span className="font-semibold">{formatInt(p.quantity_on_hand)}</span> <span className="text-ink/60">{p.unit}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {p.is_low_stock && <LowStockBadge />}
                    {!p.is_active && <StatusBadge active={false} />}
                    {p.is_active && !p.is_low_stock && <span className="text-xs text-ink/60">OK</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="divide-y divide-ink/10 md:hidden">
        {products.map((p) => (
          <li key={p.id}>
            <Link href={href(p.id)} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-paper">
              <div className="min-w-0">
                <p className="truncate font-medium">{p.name}</p>
                <p className="text-xs text-ink/60">
                  {p.sku}
                  {p.location ? ` · ${p.location.code}` : ""}
                </p>
                <div className="mt-1 flex gap-1">
                  {p.is_low_stock && <LowStockBadge />}
                  {!p.is_active && <StatusBadge active={false} />}
                </div>
              </div>
              <p className="shrink-0 text-right tabular-nums">
                <span className="text-lg font-semibold">{formatInt(p.quantity_on_hand)}</span>
                <span className="block text-xs text-ink/60">{p.unit}</span>
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
