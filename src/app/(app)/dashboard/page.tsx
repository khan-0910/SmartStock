import type { Metadata } from "next";
import Link from "next/link";
import { ActionButton } from "@/components/action-button";
import { CountUp } from "@/components/count-up";
import { MovementTable } from "@/components/movement-table";
import { Alert, Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { getContext, isOwner } from "@/lib/auth";
import { friendlyDbError } from "@/lib/errors";
import { formatInt } from "@/lib/format";
import { MOVEMENT_SELECT, PRODUCT_SELECT } from "@/lib/queries";
import type { Movement, ProductWithLocation } from "@/lib/types";
import { loadDemoData, unloadDemoData } from "../products/actions";

export const metadata: Metadata = { title: "Dashboard" };

type Metrics = {
  active_products: number;
  units_on_hand: number;
  inventory_value: number | string;
  products_missing_cost: number;
  low_stock_count: number;
};

type Tone = "sage" | "lavender" | "peach" | "apricot";

// Pastel tile background + icon chip (deep tone on a light tint) per colour.
const TONES: Record<Tone, { tile: string; chip: string }> = {
  sage: { tile: "bg-lime/50", chip: "bg-lime/80 text-(--sage-ink)" },
  lavender: { tile: "bg-lilac/60", chip: "bg-lilac text-(--lav-ink)" },
  peach: { tile: "bg-coral/40", chip: "bg-coral/60 text-(--peach-ink)" },
  apricot: { tile: "bg-sun/50", chip: "bg-sun text-(--peach-ink)" },
};

const ICONS = {
  scan: "M4 7V4h3M17 4h3v3M20 17v3h-3M7 20H4v-3M8 8v8M11 8v8M14 8v8M17 8v8",
  plus: "M12 5v14M5 12h14",
  box: "M4 7.5L12 3l8 4.5v9L12 21l-8-4.5zM4 7.5l8 4.5 8-4.5M12 12v9",
  stack: "M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5",
  coin: "M12 21a9 9 0 100-18 9 9 0 000 18zM15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .8-3 2s1.3 1.7 3 2 3 .8 3 2-1.3 2-3 2c-1.4 0-2.5-.5-3-1.5M12 6v12",
  alert: "M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z",
  arrows: "M7 4v16M3.5 7.5L7 4l3.5 3.5M17 20V4M13.5 16.5L17 20l3.5-3.5",
  pin: "M12 21s7-6.2 7-12a7 7 0 10-14 0c0 5.8 7 12 7 12zM12 11.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
};

const QUICK: { href: string; title: string; caption: string; icon: string; tone: Tone }[] = [
  { href: "/scan", title: "Scan a barcode", caption: "Camera, scanner or typed", icon: ICONS.scan, tone: "sage" },
  { href: "/products/new", title: "Add a product", caption: "SKU, barcode, prices", icon: ICONS.plus, tone: "lavender" },
  { href: "/movements", title: "Movement history", caption: "Every change, newest first", icon: ICONS.arrows, tone: "apricot" },
  { href: "/locations", title: "Locations", caption: "Bins, shelves, docks", icon: ICONS.pin, tone: "peach" },
];

export default async function DashboardPage() {
  const ctx = await getContext();
  const { supabase, workspace } = ctx;

  const [metricsRes, lowRes, movesRes, locCountRes, demoRes] = await Promise.all([
    supabase.rpc("dashboard_metrics", { p_workspace_id: workspace.id }).single(),
    supabase.from("products").select(PRODUCT_SELECT).eq("workspace_id", workspace.id).eq("is_low_stock", true).order("quantity_on_hand").limit(6),
    supabase.from("stock_movements").select(MOVEMENT_SELECT).eq("workspace_id", workspace.id).order("created_at", { ascending: false }).limit(8),
    supabase.from("locations").select("id", { count: "exact", head: true }).eq("workspace_id", workspace.id),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("workspace_id", workspace.id).like("sku", "DEMO-%"),
  ]);
  const hasDemo = (demoRes.count ?? 0) > 0;

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
            <p className="mt-1 mb-3 text-sm text-ink/60">
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
      {/* Hero: soft lavender to peach wash with the headline numbers */}
      <section className="relative overflow-hidden rounded-3xl border border-ink/[0.06] bg-[linear-gradient(115deg,var(--color-lilac)_0%,var(--color-paper)_55%,var(--color-coral)_130%)] p-6 sm:p-8">
        <div aria-hidden className="absolute -top-20 right-24 size-56 rounded-full bg-lime/70 blur-2xl" />
        <div aria-hidden className="absolute -right-10 -bottom-24 size-64 rounded-full bg-coral/60 blur-2xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.08em] text-ink/50 uppercase">Overview</p>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">{workspace.name}</h1>
            <p className="mt-2 text-sm text-ink/70">
              {formatInt(m.active_products)} active products ·{" "}
              {lowCount > 0 ? <span className="font-semibold text-(--peach-ink)">{lowCount} need reordering</span> : "nothing to reorder"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/scan" className="inline-flex h-10 items-center gap-2 rounded-lg bg-ink px-4 text-sm font-semibold text-paper transition-colors hover:bg-ink-soft">
              <Icon d={ICONS.scan} /> Scan barcode
            </Link>
            <Link
              href="/products/new"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-white/80 px-4 text-sm font-semibold text-ink shadow-[0_1px_2px_rgba(45,42,62,0.08)] transition-colors hover:bg-white"
            >
              <Icon d={ICONS.plus} /> Add product
            </Link>
          </div>
        </div>
      </section>

      {hasDemo && isOwner(ctx) && (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-dashed border-brand-600/30 bg-white/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink/70">
            <span className="font-semibold text-ink">You are looking at demo data.</span> Remove it when you are ready to add your own products.
          </p>
          <ActionButton
            action={unloadDemoData}
            label="Remove demo data"
            pendingLabel="Removing…"
            confirm={{
              title: "Remove demo data?",
              body: "This deletes the 10 demo products, their movement history, and the demo locations if nothing else uses them. Your own products and locations are kept.",
              confirmLabel: "Remove demo data",
              danger: true,
            }}
          />
        </div>
      )}

      <div className="stagger-children mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Active products" value={Number(m.active_products)} href="/products" tone="sage" icon={ICONS.box} />
        <Metric label="Units on hand" value={Number(m.units_on_hand)} note="Sum across all units (each, box, roll…)." tone="lavender" icon={ICONS.stack} />
        <Metric
          label="Inventory value (at cost)"
          value={Number(m.inventory_value)}
          money
          currency={workspace.currency}
          tone="apricot"
          icon={ICONS.coin}
          note={missingCost > 0 ? `Excludes ${missingCost} product${missingCost === 1 ? "" : "s"} with no cost price.` : "Quantity × cost price, active products."}
        />
        <Metric
          label="Low stock"
          value={lowCount}
          href="/products?stock=low"
          tone="peach"
          icon={ICONS.alert}
          note={lowCount > 0 ? "At or below reorder level." : "Nothing needs reordering."}
        />
      </div>

      {/* Quick actions */}
      <div className="stagger-children mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK.map((q) => (
          <Link key={q.href} href={q.href} className="group lift flex items-center gap-3 rounded-2xl border border-ink/[0.07] bg-white p-4">
            <span className={`inline-flex size-10 shrink-0 items-center justify-center rounded-xl ${TONES[q.tone].chip}`}>
              <Icon d={q.icon} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{q.title}</span>
              <span className="block truncate text-xs text-ink/50">{q.caption}</span>
            </span>
            <span aria-hidden className="text-ink/30 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-ink">
              →
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <PanelHeader title="Needs replenishment" icon={ICONS.alert} tone="peach" href={lowCount > 0 ? "/products?stock=low" : undefined} link="View all" />
          {low.length === 0 ? (
            <p className="rounded-xl bg-lime/40 p-4 text-sm text-(--sage-ink)">✓ No active products are at or below their reorder level.</p>
          ) : (
            <ul className="stagger-children space-y-2">
              {low.map((p) => {
                const pct = p.reorder_level > 0 ? Math.min(100, Math.round((p.quantity_on_hand / p.reorder_level) * 100)) : 0;
                return (
                  <li key={p.id}>
                    <Link href={`/products/${p.id}`} className="block rounded-xl border border-ink/[0.07] p-3 transition-colors hover:border-ink/20 hover:bg-canvas">
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
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-coral/30" aria-hidden>
                        <div className="h-full rounded-full bg-(--peach-ink)/70" style={{ width: `${Math.max(4, pct)}%` }} />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <PanelHeader title="Recent movements" icon={ICONS.arrows} tone="lavender" href="/movements" link="Full history" />
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

function Icon({ d }: { d: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

function PanelHeader({ title, icon, tone, href, link }: { title: string; icon: string; tone: Tone; href?: string; link: string }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span className={`inline-flex size-8 items-center justify-center rounded-lg ${TONES[tone].chip}`}>
          <Icon d={icon} />
        </span>
        <h2 className="font-display text-base font-semibold">{title}</h2>
      </div>
      {href && (
        <Link href={href} className="text-sm font-semibold text-brand-700 hover:underline">
          {link}
        </Link>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  note,
  href,
  tone,
  icon,
  money,
  currency,
}: {
  label: string;
  value: number;
  note?: string;
  href?: string;
  tone: Tone;
  icon: string;
  money?: boolean;
  currency?: string;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-ink/70">{label}</p>
        <span className="inline-flex size-9 items-center justify-center rounded-xl bg-white/80 text-ink/80 shadow-[0_1px_2px_rgba(45,42,62,0.06)]">
          <Icon d={icon} />
        </span>
      </div>
      <p className="mt-3 font-display text-3xl font-bold tracking-tight">
        <CountUp value={value} format={money ? "money" : "int"} currency={currency} />
      </p>
      {note && <p className="mt-1.5 text-xs text-ink/60">{note}</p>}
    </>
  );
  const cls = `block rounded-2xl border border-ink/[0.06] p-5 ${TONES[tone].tile}`;
  return href ? (
    <Link href={href} className={`lift ${cls}`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
