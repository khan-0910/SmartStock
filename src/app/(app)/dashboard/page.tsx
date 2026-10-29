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
      <section className="relative overflow-hidden rounded-[2rem] bg-ink p-6 text-paper sm:p-8">
        <div aria-hidden className="absolute -top-16 -right-10 size-56 rounded-full bg-brand-600/40" />
        <div aria-hidden className="absolute -bottom-20 right-40 size-40 rounded-full bg-lime/25" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold tracking-wide text-lime uppercase">Dashboard</p>
            <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
              Welcome back to <span className="font-serif font-normal italic text-lime">{workspace.name}</span>
            </h1>
            <p className="mt-2 text-sm text-paper/60">Figures reflect the database when this page loaded. Refresh to update.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/scan" className="inline-flex h-11 items-center gap-2 rounded-full bg-lime px-5 text-sm font-bold text-ink transition-transform hover:-translate-y-0.5">
              Scan barcode
            </Link>
            <Link href="/products/new" className="inline-flex h-11 items-center rounded-full border-2 border-paper/30 px-5 text-sm font-bold text-paper transition-colors hover:border-paper hover:bg-paper hover:text-ink">
              Add product
            </Link>
          </div>
        </div>
      </section>

      <div className="stagger-pop mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          note={lowCount > 0 ? "At or below reorder level. Tap to see them." : "Nothing needs reordering."}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Needs replenishment</h2>
            {lowCount > 0 && (
              <Link href="/products?stock=low" className="text-sm font-semibold text-brand-700 hover:underline">
                View all
              </Link>
            )}
          </div>
          {low.length === 0 ? (
            <p className="rounded-2xl bg-teal/15 p-4 text-sm text-ink/80">✓ No active products are at or below their reorder level.</p>
          ) : (
            <ul className="stagger-children space-y-2">
              {low.map((p) => {
                const pct = p.reorder_level > 0 ? Math.min(100, Math.round((p.quantity_on_hand / p.reorder_level) * 100)) : 0;
                return (
                  <li key={p.id}>
                    <Link href={`/products/${p.id}`} className="lift block rounded-2xl border-2 border-ink/10 p-3 hover:border-ink">
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
            <h2 className="font-display text-lg font-bold">Recent movements</h2>
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
}: {
  label: string;
  value: number;
  note?: string;
  href?: string;
  color: string;
  money?: boolean;
}) {
  const body = (
    <>
      <p className="text-sm font-semibold text-ink/70">{label}</p>
      <p className="mt-2 font-display text-4xl font-extrabold tracking-tight">
        <CountUp value={value} format={money ? "money" : "int"} />
      </p>
      {note && <p className="mt-2 text-xs text-ink/70">{note}</p>}
      {href && (
        <span aria-hidden className="absolute top-4 right-4 inline-flex size-8 items-center justify-center rounded-full bg-ink text-sm text-paper transition-transform group-hover:rotate-[-45deg]">
          →
        </span>
      )}
    </>
  );
  const cls = `group relative block rounded-[1.5rem] border-2 border-ink p-5 ${color}`;
  return href ? (
    <Link href={href} className={`lift ${cls}`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
