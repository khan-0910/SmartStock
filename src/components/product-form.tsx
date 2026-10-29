"use client";

import Link from "next/link";
import { useActionState } from "react";
import { SubmitButton } from "./submit-button";
import { Alert, describedBy, Field, inputClass, LinkButton } from "./ui";
import type { ActionState, Location, Product } from "@/lib/types";

type Values = Record<string, string>;

function initialValues(product?: Product, barcode?: string): Values {
  return {
    name: product?.name ?? "",
    sku: product?.sku ?? "",
    barcode: product?.barcode ?? barcode ?? "",
    description: product?.description ?? "",
    unit: product?.unit ?? "each",
    cost_price: product?.cost_price != null ? String(product.cost_price) : "",
    selling_price: product?.selling_price != null ? String(product.selling_price) : "",
    reorder_level: String(product?.reorder_level ?? 0),
    primary_location_id: product?.primary_location_id ?? "",
  };
}

export function ProductForm({
  action,
  product,
  locations,
  prefillBarcode,
  cancelHref,
}: {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  product?: Product;
  locations: Pick<Location, "id" | "code" | "name" | "is_active">[];
  prefillBarcode?: string;
  cancelHref: string;
}) {
  const [state, formAction] = useActionState(action, { status: "idle" });
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  // After a failed submit, show what the user typed rather than the originals.
  const values = state.status === "error" && state.values ? state.values : initialValues(product, prefillBarcode);
  // key forces inputs to pick up new defaultValues after each failed submit.
  const formKey = state.status === "error" ? JSON.stringify(state.values) : "initial";

  const text = (name: keyof Values & string, label: string, opts: { required?: boolean; hint?: string; inputMode?: "decimal" | "numeric"; maxLength?: number; autoComplete?: string } = {}) => (
    <Field id={name} label={label} required={opts.required} hint={opts.hint} error={errors[name]}>
      <input
        id={name}
        name={name}
        defaultValue={values[name]}
        required={opts.required}
        inputMode={opts.inputMode}
        maxLength={opts.maxLength}
        autoComplete={opts.autoComplete ?? "off"}
        className={inputClass}
        {...describedBy(name, { hint: !!opts.hint, error: errors[name] })}
      />
    </Field>
  );

  return (
    <form key={formKey} action={formAction} className="space-y-6" noValidate>
      {state.status === "error" && (
        <Alert tone="error" role="alert" title={state.message}>
          {state.link && (
            <Link href={state.link.href} className="font-semibold underline">
              {state.link.label}
            </Link>
          )}
        </Alert>
      )}

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold text-ink">Identity</legend>
        <div className="sm:col-span-2">{text("name", "Product name", { required: true, maxLength: 200 })}</div>
        {text("sku", "SKU", { required: true, maxLength: 64, hint: "Your internal code. Unique in this workspace; not case-sensitive." })}
        {text("barcode", "Barcode", {
          maxLength: 64,
          hint: "EAN/UPC/Code 128 value. Kept exactly as typed, including leading zeroes.",
          inputMode: "numeric",
        })}
        <div className="sm:col-span-2">
          <Field id="description" label="Description" error={errors.description}>
            <textarea
              id="description"
              name="description"
              rows={3}
              maxLength={2000}
              defaultValue={values.description}
              className={inputClass}
              {...describedBy("description", { error: errors.description })}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold text-ink">Stock settings</legend>
        {text("unit", "Unit", { required: true, maxLength: 20, hint: "How you count it: each, box, roll, pair…" })}
        {text("reorder_level", "Reorder level", {
          required: true,
          inputMode: "numeric",
          hint: "Flagged as low stock at or below this number. 0 turns alerts off.",
        })}
        <div className="sm:col-span-2">
          <Field
            id="primary_location_id"
            label="Primary location"
            error={errors.primary_location_id}
            hint={
              locations.length === 0 ? (
                <>
                  No locations yet. <Link href="/locations" className="underline">Add one</Link> first if you want to track where this is stored.
                </>
              ) : (
                "Where this product is stored."
              )
            }
          >
            <select
              id="primary_location_id"
              name="primary_location_id"
              defaultValue={values.primary_location_id}
              className={inputClass}
              {...describedBy("primary_location_id", { hint: true, error: errors.primary_location_id })}
            >
              <option value="">No location</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.code} — {l.name}
                  {l.is_active ? "" : " (inactive)"}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <p className="text-xs text-ink/60 sm:col-span-2">
          Quantity is not edited here. Use stock in, stock out or adjustment on the product page so every change is recorded.
        </p>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold text-ink">Pricing</legend>
        {text("cost_price", "Cost price (USD)", { inputMode: "decimal", hint: "Used for inventory value. Leave blank if unknown." })}
        {text("selling_price", "Selling price (USD)", { inputMode: "decimal" })}
      </fieldset>

      <div className="flex flex-wrap gap-2 border-t border-ink/10 pt-4">
        <SubmitButton pendingLabel="Saving…">{product ? "Save changes" : "Create product"}</SubmitButton>
        <LinkButton href={cancelHref} variant="secondary">
          Cancel
        </LinkButton>
      </div>
    </form>
  );
}
