import type { Metadata } from "next";
import Link from "next/link";
import { ActionButton } from "@/components/action-button";
import { MovementTable } from "@/components/movement-table";
import { Alert, Card, EmptyState, LinkButton, LowStockBadge, PageHeader } from "@/components/ui";
import { getContext, isOwner } from "@/lib/auth";
import { friendlyDbError } from "@/lib/errors";
import { formatInt, formatMoney } from "@/lib/format";
import { MOVEMENT_SELECT, PRODUCT_SELECT } from "@/lib/queries";
import type { Movement, ProductWithLocation } from "@/lib/types";
import { loadDemoData } from "../products/actions";

export const metadata: Metadata = { title: "Dashboard" };

type Metrics = {
  active_products: number;
  units_on_hand: number;
  inventory_value: number | string;
  products_missing_cost: number;
  low_stock_count: number;
};

export default async function DashboardPage() {
  const ctx = await getContext();
  const { supabase, workspace } = ctx;

  const [metricsRes, lowRes, movesRes, locCountRes] = await Promise.all([
    supabase.rpc("dashboard_metrics", { p_workspace_id: workspace.id }).single(),
    supabase.from("products").select(PRODUCT_SELECT).eq("workspace_id", workspace.id).eq("is_low_stock", true).order("quantity_on_hand").limit(6),
    supabase.from("stock_movements").select(MOVEMENT_SELECT).eq("workspace_id", workspace.id).order("created_at", { ascending: false }).limit(8),
    supabase.from("locations").select("id", { count: "exact", head: true }).eq("workspace_id", workspace.id),
  ]);

  const error = metricsRes.error ?? lowRes.error ?? movesRes.error;
  if (error) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <Alert tone="error" role="alert" title="Could not load the dashboard">
          {friendlyDbError(error, "dashboard")}
        </Alert>
      </>
    );
  }

  const m = metricsRes.data as Metrics;
  const low = (lowRes.data ?? []) as ProductWithLocation[];
  const moves = (movesRes.data ?? []) as unknown as Movement[];
  const hasProducts = Number(m.active_products) > 0 || moves.length > 0;
  const locationCount = locCountRes.count ?? 0;

  if (!hasProducts) {
    return (
      <>
        <PageHeader title="Welcome to SmartStock" description={`Workspace: ${workspace.name}`} />
        <EmptyState
          title="Your inventory is empty"
          actions={
            <>
              <LinkButton href="/locations" variant={locationCount ? "secondary" : "primary"}>
                {locationCount ? "Manage locations" : "1. Add a location"}
              </LinkButton>
              <LinkButton href="/products/new" variant={locationCount ? "primary" : "secondary"}>
                {locationCount ? "Add your first product" : "2. Add a product"}
              </LinkButton>
            </>
          }
        >
          <p>Start by adding a storage location (like A-01-03), then add products and record their opening stock.</p>
        </EmptyState>
        {isOwner(ctx) && (
          <Card className="mt-6">
            <h2 className="text-sm font-semibold">Just exploring?</h2>
            <p className="mb-3 mt-1 text-sm text-slate-600">
              Load 10 fictional products, 4 locations and some sample movements. Only works while the workspace has no products.
            </p>
            <ActionButton action={loadDemoData} label="Load demo data" pendingLabel="Loading…" />
          </Card>
        )}
      </>
    );
  }

  const missingCost = Number(m.products_missing_cost);
  const lowCount = Number(m.low_stock_count);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Figures reflect the database when this page loaded. Refresh to update."
        actions={
          <>
            <LinkButton href="/scan">Scan barcode</LinkButton>
            <LinkButton href="/products/new" variant="secondary">
              Add product
            </LinkButton>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Active products" value={formatInt(m.active_products)} href="/products" />
        <Metric label="Units on hand" value={formatInt(m.units_on_hand)} note="Sum across all units (each, box, roll…)." />
        <Metric
          label="Inventory value (at cost)"
          value={formatMoney(m.inventory_value)}
          note={missingCost > 0 ? `Excludes ${missingCost} product${missingCost === 1 ? "" : "s"} with no cost price.` : "Quantity × cost price, active products."}
        />
        <Metric
          label="Low stock"
          value={formatInt(lowCount)}
          href="/products?stock=low"
          tone={lowCount > 0 ? "warning" : undefined}
          note={lowCount > 0 ? "At or below reorder level." : "Nothing needs reordering."}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Needs replenishment</h2>
            {lowCount > 0 && (
              <Link href="/products?stock=low" className="text-sm font-semibold text-brand-700 hover:underline">
                View all
              </Link>
            )}
          </div>
          {low.length === 0 ? (
            <p className="text-sm text-slate-600">No active products are at or below their reorder level.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {low.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <Link href={`/products/${p.id}`} className="block truncate text-sm font-medium hover:underline">
                      {p.name}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {p.sku}
                      {p.location ? ` · ${p.location.code}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums">
                      {formatInt(p.quantity_on_hand)} <span className="font-normal text-slate-500">/ {formatInt(p.reorder_level)}</span>
                    </p>
                    <LowStockBadge />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Recent movements</h2>
            <Link href="/movements" className="text-sm font-semibold text-brand-700 hover:underline">
              Full history
            </Link>
          </div>
          {moves.length === 0 ? (
            <p className="text-sm text-slate-600">No stock movements yet. Record stock in from a product page or the scanner.</p>
          ) : (
            <MovementTable movements={moves} currentUserId={ctx.user.id} />
          )}
        </Card>
      </div>
    </>
  );
}

function Metric({ label, value, note, href, tone }: { label: string; value: string; note?: string; href?: string; tone?: "warning" }) {
  const body = (
    <>
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${tone === "warning" ? "text-amber-700" : "text-slate-900"}`}>{value}</p>
      {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
    </>
  );
  const cls = "block rounded-xl border border-slate-200 bg-white p-4 shadow-sm";
  return href ? (
    <Link href={href} className={`${cls} hover:border-brand-600`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
