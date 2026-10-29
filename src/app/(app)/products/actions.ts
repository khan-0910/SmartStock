"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getContext, isOwner } from "@/lib/auth";
import { dbErrorCode, friendlyDbError } from "@/lib/errors";
import { PRODUCT_SELECT } from "@/lib/queries";
import { rateLimit } from "@/lib/rate-limit";
import type { ActionState, MovementType, ProductWithLocation } from "@/lib/types";
import { fieldErrors, formFields, isUuid, movementSchema, normalizeBarcode, productSchema } from "@/lib/validation";

const PRODUCT_FIELDS = [
  "name",
  "sku",
  "barcode",
  "description",
  "unit",
  "cost_price",
  "selling_price",
  "reorder_level",
  "primary_location_id",
] as const;

function revalidateInventory(productId?: string) {
  revalidatePath("/", "layout");
  if (productId) revalidatePath(`/products/${productId}`);
}

/** Create (productId = null) or update a product. Bound with .bind(null, id). */
export async function saveProduct(productId: string | null, _prev: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await getContext();
  const raw = formFields(form, PRODUCT_FIELDS);
  if (!isOwner(ctx)) return { status: "error", message: "Only workspace owners can edit products.", values: raw };
  if (productId !== null && !isUuid(productId)) return { status: "error", message: "Invalid product." };

  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", message: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error), values: raw };
  }
  const input = parsed.data;

  // Location must be visible to this user (RLS = same workspace). Active is
  // enforced by a database trigger when the location changes.
  if (input.primary_location_id) {
    const { data: loc } = await ctx.supabase.from("locations").select("id").eq("id", input.primary_location_id).maybeSingle();
    if (!loc) return { status: "error", message: "Please fix the highlighted fields.", fieldErrors: { primary_location_id: "Choose a location from the list." }, values: raw };
  }

  const query =
    productId === null
      ? ctx.supabase.from("products").insert({ ...input, workspace_id: ctx.workspace.id }).select("id").single()
      : ctx.supabase.from("products").update(input).eq("id", productId).select("id").single();
  const { data, error } = await query;

  if (error || !data) {
    if (!error) return { status: "error", message: "Product not found.", values: raw };
    const code = dbErrorCode(error);
    const message = friendlyDbError(error, "saveProduct");
    if (code === "DUPLICATE_SKU") return { status: "error", message, fieldErrors: { sku: message }, values: raw };
    if (code === "DUPLICATE_BARCODE") {
      const { data: other } = await ctx.supabase.from("products").select("id, name").eq("barcode", input.barcode ?? "").maybeSingle();
      return {
        status: "error",
        message,
        fieldErrors: { barcode: other ? `Already used by “${other.name}”.` : message },
        values: raw,
        link: other ? { href: `/products/${other.id}`, label: `View ${other.name}` } : undefined,
      };
    }
    if (code === "LOCATION_INACTIVE") return { status: "error", message, fieldErrors: { primary_location_id: message }, values: raw };
    if (error.code === "PGRST116") return { status: "error", message: "Product not found or you cannot edit it.", values: raw };
    return { status: "error", message, values: raw };
  }

  revalidateInventory(data.id);
  redirect(`/products/${data.id}?saved=1`);
}

/** Archive (active = false) or restore a product. History is never deleted. */
export async function setProductActive(productId: string, active: boolean): Promise<ActionState> {
  const ctx = await getContext();
  if (!isOwner(ctx)) return { status: "error", message: "Only workspace owners can archive products." };
  if (!isUuid(productId)) return { status: "error", message: "Invalid product." };
  const { data, error } = await ctx.supabase.from("products").update({ is_active: active }).eq("id", productId).select("id").maybeSingle();
  if (error) return { status: "error", message: friendlyDbError(error, "setProductActive") };
  if (!data) return { status: "error", message: "Product not found." };
  revalidateInventory(productId);
  return { status: "success", message: active ? "Product restored." : "Product archived. Its history is kept." };
}

export type MovementResult = {
  movementId: string;
  balanceBefore: number;
  balanceAfter: number;
  delta: number;
  type: MovementType;
  replayed: boolean;
};

/**
 * Stock in / out / adjustment. All checks and the update+insert happen in
 * record_stock_movement() inside one database transaction; this action only
 * validates shape and maps errors. Success is reported only after commit.
 */
export async function recordMovement(_prev: ActionState<MovementResult>, form: FormData): Promise<ActionState<MovementResult>> {
  const ctx = await getContext();
  const raw = formFields(form, ["product_id", "movement_type", "quantity", "reason", "reference", "idempotency_key"]);
  const wait = rateLimit(`move:${ctx.user.id}`, 120, 60_000);
  if (wait) return { status: "error", message: `Too many stock changes in a short time. Wait ${wait} seconds.`, values: raw };
  const parsed = movementSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", message: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error), values: raw };
  }
  const m = parsed.data;

  const { data, error } = await ctx.supabase
    .rpc("record_stock_movement", {
      p_product_id: m.product_id,
      p_movement_type: m.movement_type,
      p_quantity: m.quantity,
      p_reason: m.reason,
      p_reference: m.reference,
      p_idempotency_key: m.idempotency_key,
    })
    .single();

  if (error || !data) {
    // Refresh views so a stale balance on screen gets corrected.
    revalidateInventory(m.product_id);
    return { status: "error", message: error ? friendlyDbError(error, "recordMovement") : "Nothing was saved.", values: raw };
  }

  const row = data as { movement_id: string; balance_before: number; balance_after: number; delta: number; replayed: boolean };
  revalidateInventory(m.product_id);
  return {
    status: "success",
    message: row.replayed ? "This movement was already recorded." : "Movement recorded.",
    data: {
      movementId: row.movement_id,
      balanceBefore: row.balance_before,
      balanceAfter: row.balance_after,
      delta: row.delta,
      type: m.movement_type,
      replayed: row.replayed,
    },
  };
}

export type LookupResult =
  | { status: "found"; code: string; product: ProductWithLocation }
  | { status: "not_found"; code: string }
  | { status: "error"; code: string; message: string };

/** Exact barcode lookup in the caller's workspace. Never changes stock. */
export async function lookupBarcode(rawCode: string): Promise<LookupResult> {
  const ctx = await getContext();
  if (rateLimit(`lookup:${ctx.user.id}`, 240, 60_000)) return { status: "error", code: "", message: "Too many lookups. Wait a moment and try again." };
  const code = normalizeBarcode(typeof rawCode === "string" ? rawCode : "");
  if (!code) return { status: "error", code, message: "Enter or scan a barcode." };
  if (code.length > 64) return { status: "error", code: code.slice(0, 64), message: "That code is too long to be a barcode." };

  const { data, error } = await ctx.supabase.from("products").select(PRODUCT_SELECT).eq("barcode", code).maybeSingle();
  if (error) return { status: "error", code, message: friendlyDbError(error, "lookupBarcode") };
  if (!data) return { status: "not_found", code };
  return { status: "found", code, product: data as ProductWithLocation };
}

export async function loadDemoData(): Promise<ActionState> {
  const ctx = await getContext();
  if (!isOwner(ctx)) return { status: "error", message: "Only workspace owners can load demo data." };
  const { error } = await ctx.supabase.rpc("load_demo_data");
  if (error) return { status: "error", message: friendlyDbError(error, "loadDemoData") };
  revalidateInventory();
  return { status: "success", message: "Demo data loaded." };
}
