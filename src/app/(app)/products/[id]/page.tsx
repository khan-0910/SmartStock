import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/action-button";
import { MovementTable } from "@/components/movement-table";
import { StockMovementForm } from "@/components/stock-movement-form";
import { Alert, Card, LinkButton, LowStockBadge, PageHeader, StatusBadge } from "@/components/ui";
import { getContext, isOwner } from "@/lib/auth";
import { formatInt } from "@/lib/format";
import { moneyDisplay } from "@/lib/fx";
import { MOVEMENT_SELECT, PRODUCT_SELECT } from "@/lib/queries";
import type { Movement, MovementType, ProductWithLocation } from "@/lib/types";
import { isUuid } from "@/lib/validation";
import { setProductActive } from "../actions";

export const metadata: Metadata = { title: "Product" };

type Search = { back?: string; saved?: string; action?: string };

export default async function ProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Search> }) {
  const { id } = await params;
  const sp = await searchParams;
  if (!isUuid(id)) notFound();
  const ctx = await getContext();
  const money = await moneyDisplay(ctx.workspace.currency);

  const [productRes, movesRes] = await Promise.all([
    ctx.supabase.from("products").select(PRODUCT_SELECT).eq("id", id).maybeSingle(),
    ctx.supabase.from("stock_movements").select(MOVEMENT_SELECT).eq("product_id", id).order("created_at", { ascending: false }).limit(10),
  ]);
  if (productRes.error) throw new Error("Could not load this product.");
  const product = productRes.data as ProductWithLocation | null;
  if (!product) notFound();
  const moves = (movesRes.data ?? []) as unknown as Movement[];

  const back = sp.back?.startsWith("/products") ? sp.back : "/products";
  const owner = isOwner(ctx);
  const initialType: MovementType = sp.action === "stock_out" || sp.action === "adjustment" ? sp.action : "stock_in";
  const locationLabel = product.location ? `${product.location.code} — ${product.location.name}` : null;

  return (
    <>
      <Link href={back} className="mb-3 inline-flex text-sm font-medium text-brand-700 hover:underline">
        ← Back to products
      </Link>
      <PageHeader
        title={product.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span>SKU {product.sku}</span>
            <StatusBadge active={product.is_active} />
            {product.is_low_stock && <LowStockBadge />}
          </span>
        }
        actions={
          owner && (
            <LinkButton href={`/products/${product.id}/edit`} variant="secondary">
              Edit details
            </LinkButton>
          )
        }
      />

      {sp.saved && (
        <div className="mb-4">
          <Alert tone="success" role="status">
            Product saved.
          </Alert>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <p className="text-sm font-medium text-ink/60">On hand</p>
            <p className="mt-1 text-4xl font-bold tabular-nums">
              {formatInt(product.quantity_on_hand)} <span className="text-lg font-medium text-ink/60">{product.unit}</span>
            </p>
            <p className="mt-1 text-sm text-ink/60">
              Reorder level: {formatInt(product.reorder_level)}
              {product.reorder_level === 0 && " (alerts off)"}
            </p>
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 border-t border-ink/10 pt-4 text-sm">
              <dt className="text-ink/60">Location</dt>
              <dd>
                {product.location ? (
                  <>
                    <span className="font-medium">{product.location.code}</span> — {product.location.name}
                    {!product.location.is_active && <span className="text-amber-700"> (inactive)</span>}
                  </>
                ) : (
                  <span className="text-ink/60">Not set</span>
                )}
              </dd>
              <dt className="text-ink/60">Barcode</dt>
              <dd className="font-mono text-xs leading-5">{product.barcode ?? <span className="font-sans text-ink/60">None</span>}</dd>
              <dt className="text-ink/60">Cost price</dt>
              <dd>{money.format(product.cost_price)}</dd>
              <dt className="text-ink/60">Selling price</dt>
              <dd>{money.format(product.selling_price)}</dd>
            </dl>
            <p className="mt-3 text-xs text-ink/50">
              Prices are stored in USD{money.currency !== "USD" ? ` and shown in ${money.currency} at today's reference rate` : ""}.
              {product.price_currency && product.price_currency !== "USD" && (
                <> Entered in {product.price_currency} at 1 USD = {Number(product.price_fx_rate).toLocaleString("en-US", { maximumFractionDigits: 4 })} {product.price_currency}.</>
              )}
              {!money.converted && " Exchange rates are unavailable right now, so amounts are shown in USD."}
            </p>
            {product.description && <p className="mt-4 whitespace-pre-line border-t border-ink/10 pt-4 text-sm text-ink/80">{product.description}</p>}
          </Card>

          {owner && (
            <Card>
              <h2 className="text-sm font-semibold">{product.is_active ? "Archive product" : "Restore product"}</h2>
              <p className="mb-3 mt-1 text-sm text-ink/60">
                {product.is_active
                  ? "Archived products are hidden from the active list and cannot receive stock changes. History is kept."
                  : "Restoring makes the product active again so stock can be recorded."}
              </p>
              {product.is_active ? (
                <ActionButton
                  action={setProductActive.bind(null, product.id, false)}
                  label="Archive product"
                  pendingLabel="Archiving…"
                  confirm={{
                    title: `Archive ${product.name}?`,
                    body: `It currently has ${formatInt(product.quantity_on_hand)} ${product.unit} on hand. The product and its history stay in the database; you can restore it later.`,
                    confirmLabel: "Archive",
                    danger: true,
                  }}
                />
              ) : (
                <ActionButton action={setProductActive.bind(null, product.id, true)} label="Restore product" pendingLabel="Restoring…" />
              )}
            </Card>
          )}
        </div>

        <Card className="lg:col-span-3">
          <h2 className="mb-4 font-semibold">Record stock change</h2>
          <StockMovementForm
            key={product.id}
            initialType={initialType}
            product={{
              id: product.id,
              name: product.name,
              sku: product.sku,
              unit: product.unit,
              quantity_on_hand: product.quantity_on_hand,
              is_active: product.is_active,
              locationLabel,
            }}
          />
        </Card>
      </div>

      <Card className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Recent history</h2>
          <Link href={`/movements?product=${product.id}`} className="text-sm font-semibold text-brand-700 hover:underline">
            All movements for this product
          </Link>
        </div>
        {moves.length === 0 ? (
          <p className="text-sm text-ink/60">No movements yet. Record the opening balance with a stock in.</p>
        ) : (
          <MovementTable movements={moves} currentUserId={ctx.user.id} showProduct={false} />
        )}
      </Card>
    </>
  );
}
