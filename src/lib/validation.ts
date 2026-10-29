import { z } from "zod";

// Shared input rules. The database enforces the same limits; these give
// friendly, field-level messages first.

export const MAX_MOVE_QTY = 1_000_000;
export const MAX_QTY = 1_000_000_000;

const UUID = z.uuid({ message: "Invalid id." });

/** Trim and collapse internal whitespace runs to one space. */
export function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

/** Barcodes stay strings: trim surrounding whitespace only, keep leading zeroes. */
export function normalizeBarcode(value: string) {
  return value.trim();
}

export function normalizeLocationCode(value: string) {
  return value.trim().toUpperCase();
}

const requiredText = (label: string, max: number) =>
  z
    .string()
    .transform(normalizeText)
    .pipe(z.string().min(1, `${label} is required.`).max(max, `${label} must be ${max} characters or fewer.`));

const optionalText = (label: string, max: number) =>
  z
    .string()
    .transform((v) => v.trim())
    .pipe(z.string().max(max, `${label} must be ${max} characters or fewer.`))
    .transform((v) => (v === "" ? null : v));

const wholeNumber = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .regex(/^\d+$/, `${label} must be a whole number.`)
    .transform(Number)
    .pipe(
      z
        .number()
        .int()
        .min(min, `${label} must be at least ${min}.`)
        .max(max, `${label} must be ${max.toLocaleString("en-US")} or less.`),
    );

// Prices stay strings so PostgreSQL numeric gets exact values (no floats).
const optionalPrice = (label: string) =>
  z
    .string()
    .trim()
    .transform((v) => v.replace(/^\$/, ""))
    .refine((v) => v === "" || /^\d{1,10}(\.\d{1,2})?$/.test(v), `${label} must be a number like 12.50 (0 or more).`)
    .transform((v) => (v === "" ? null : v));

const barcode = z
  .string()
  .transform(normalizeBarcode)
  .refine((v) => v.length <= 64, "Barcode must be 64 characters or fewer.")
  .refine((v) => !/[\u0000-\u001f\u007f]/.test(v), "Barcode contains invalid characters.")
  .transform((v) => (v === "" ? null : v));

export const productSchema = z.object({
  name: requiredText("Name", 200),
  sku: requiredText("SKU", 64),
  barcode,
  description: optionalText("Description", 2000),
  unit: requiredText("Unit", 20),
  cost_price: optionalPrice("Cost price"),
  selling_price: optionalPrice("Selling price"),
  reorder_level: wholeNumber("Reorder level", 0, MAX_QTY),
  primary_location_id: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .pipe(UUID.nullable()),
});
export type ProductInput = z.infer<typeof productSchema>;

export const locationSchema = z.object({
  code: z
    .string()
    .transform(normalizeLocationCode)
    .pipe(
      z
        .string()
        .min(1, "Code is required.")
        .max(32, "Code must be 32 characters or fewer.")
        .regex(/^[A-Z0-9][A-Z0-9._\-/ ]*$/, "Use letters, numbers, spaces, and - _ . / only."),
    ),
  name: requiredText("Name", 100),
  description: optionalText("Description", 500),
});
export type LocationInput = z.infer<typeof locationSchema>;

export const MOVEMENT_TYPES = ["stock_in", "stock_out", "adjustment"] as const;

export const movementSchema = z
  .object({
    product_id: UUID,
    movement_type: z.enum(MOVEMENT_TYPES, { message: "Choose stock in, stock out, or adjustment." }),
    quantity: z.string(),
    reason: requiredText("Reason", 200),
    reference: optionalText("Reference", 200),
    idempotency_key: UUID,
  })
  .transform((v, ctx) => {
    const isAdjust = v.movement_type === "adjustment";
    const parsed = (isAdjust ? wholeNumber("Counted quantity", 0, MAX_QTY) : wholeNumber("Quantity", 1, MAX_MOVE_QTY)).safeParse(
      v.quantity,
    );
    if (!parsed.success) {
      ctx.addIssue({ code: "custom", path: ["quantity"], message: parsed.error.issues[0]?.message ?? "Invalid quantity." });
      return z.NEVER;
    }
    return { ...v, quantity: parsed.data };
  });
export type MovementInput = z.infer<typeof movementSchema>;

/** Read named string fields from FormData (files and missing keys become ""). */
export function formFields<K extends string>(form: FormData, keys: readonly K[]): Record<K, string> {
  const out = {} as Record<K, string>;
  for (const key of keys) {
    const v = form.get(key);
    out[key] = typeof v === "string" ? v : "";
  }
  return out;
}

/** First message per field, keyed by top-level field name. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

/** Strip characters that have meaning in PostgREST filter syntax. */
export function safeSearchTerm(value: string | undefined) {
  return (value ?? "").replace(/[,()*%\\"]/g, " ").trim().slice(0, 100);
}

export function pageNumber(value: string | undefined) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 && n < 100_000 ? n : 1;
}

export function isUuid(value: string | undefined): value is string {
  return !!value && UUID.safeParse(value).success;
}
