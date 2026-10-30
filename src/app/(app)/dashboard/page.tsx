import type { Metadata } from "next";
import Link from "next/link";
import { ActionButton } from "@/components/action-button";
import { MovementTable } from "@/components/movement-table";
import { Alert, Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { getContext, isOwner } from "@/lib/auth";
import { friendlyDbError } from "@/lib/errors";
import { CountUp } from "@/components/count-up";
import { formatInt } from "@/lib/format";
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
            <p className="mb-3 mt-1 text-sm text-ink/60">
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
      {/* Hero band */}
      <section className="relative overflow-hidden rounded-2xl bg-ink p-6 text-paper sm:p-8">
        <div aria-hidden className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(28rem_14rem_at_100%_0%,rgba(91,61,245,0.45),transparent_70%)]" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.08em] text-paper/50 uppercase">Overview</p>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">{workspace.name}</h1>
            <p className="mt-2 text-sm text-paper/60">Figures reflect the database when this page loaded. Refresh to update.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/scan" className="inline-flex h-10 items-center gap-2 rounded-lg bg-lime px-4 text-sm font-semibold text-ink transition-colors hover:bg-[#e4ff7a]">
              Scan barcode
            </Link>
            <Link href="/products/new" className="inline-flex h-10 items-center rounded-lg border border-paper/20 px-4 text-sm font-semibold text-paper transition-colors hover:bg-white/10">
              Add product
            </Link>
          </div>
        </div>
      </section>

      <div className="stagger-children mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Active products" value={Number(m.active_products)} href="/products" color="bg-lime" />
        <Metric label="Units on hand" value={Number(m.units_on_hand)} note="Sum across all units (each, box, roll…)." color="bg-lilac" />
        <Metric
          label="Inventory value (at cost)"
          value={Number(m.inventory_value)}
          money
          color="bg-sun"
          note={missingCost > 0 ? `Excludes ${missingCost} product${missingCost === 1 ? "" : "s"} with no cost price.` : "Quantity × cost price, active products."}
        />
        <Metric
          label="Low stock"
          value={lowCount}
          href="/products?stock=low"
          color={lowCount > 0 ? "bg-coral" : "bg-teal"}
          alert={lowCount > 0}
          note={lowCount > 0 ? "At or below reorder level. Tap to see them." : "Nothing needs reordering."}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">Needs replenishment</h2>
            {lowCount > 0 && (
              <Link href="/products?stock=low" className="text-sm font-semibold text-brand-700 hover:underline">
                View all
              </Link>
            )}
          </div>
          {low.length === 0 ? (
            <p className="rounded-xl bg-teal/10 p-4 text-sm text-ink/80">✓ No active products are at or below their reorder level.</p>
          ) : (
            <ul className="stagger-children space-y-2">
              {low.map((p) => {
                const pct = p.reorder_level > 0 ? Math.min(100, Math.round((p.quantity_on_hand / p.reorder_level) * 100)) : 0;
                return (
                  <li key={p.id}>
                    <Link href={`/products/${p.id}`} className="block rounded-xl border border-ink/[0.08] p-3 transition-colors hover:border-ink/25 hover:bg-canvas/50">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{p.name}</p>
                          <p className="text-xs text-ink/50">
                            {p.sku}
                            {p.location ? ` · ${p.location.code}` : ""}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-bold tabular-nums">
                          {formatInt(p.quantity_on_hand)} <span className="font-normal text-ink/50">/ {formatInt(p.reorder_level)}</span>
                        </p>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/10" aria-hidden>
                        <div className="h-full origin-left rounded-full bg-coral" style={{ width: `${Math.max(4, pct)}%` }} />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">Recent movements</h2>
            <Link href="/movements" className="text-sm font-semibold text-brand-700 hover:underline">
              Full history
            </Link>
          </div>
          {moves.length === 0 ? (
            <p className="text-sm text-ink/60">No stock movements yet. Record stock in from a product page or the scanner.</p>
          ) : (
            <MovementTable movements={moves} currentUserId={ctx.user.id} />
          )}
        </Card>
      </div>
    </>
  );
}

function Metric({
  label,
  value,
  note,
  href,
  color,
  money,
  alert,
}: {
  label: string;
  value: number;
  note?: string;
  href?: string;
  color: string;
  money?: boolean;
  alert?: boolean;
}) {
  const body = (
    <>
      <div className="flex items-center gap-2">
        <span aria-hidden className={`size-2 rounded-full ${color}`} />
        <p className="text-sm font-medium text-ink/60">{label}</p>
      </div>
      <p className={`mt-3 font-display text-3xl font-bold tracking-tight ${alert ? "text-[#c2391d]" : "text-ink"}`}>
        <CountUp value={value} format={money ? "money" : "int"} />
      </p>
      {note && <p className="mt-1.5 text-xs text-ink/50">{note}</p>}
    </>
  );
  const cls = "block rounded-2xl border border-ink/[0.08] bg-white p-5 shadow-[0_1px_2px_rgba(19,17,28,0.04)]";
  return href ? (
    <Link href={href} className={`lift ${cls} hover:border-ink/20`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
