"use client";

import Link from "next/link";
import { useActionState, useId, useRef, useState } from "react";
import { recordMovement, type MovementResult } from "@/app/(app)/products/actions";
import { formatDelta, formatInt, MOVEMENT_LABELS } from "@/lib/format";
import type { ActionState, MovementType } from "@/lib/types";
import { newUuid } from "@/lib/uuid";
import { MAX_MOVE_QTY, MAX_QTY } from "@/lib/validation";
import { Alert, Button, cx, describedBy, Field, inputClass } from "./ui";

export type MovementProduct = {
  id: string;
  name: string;
  sku: string;
  unit: string;
  quantity_on_hand: number;
  is_active: boolean;
  locationLabel?: string | null;
};

const REASONS: Record<MovementType, string[]> = {
  stock_in: ["Received", "Customer return", "Opening balance", "Transfer in"],
  stock_out: ["Sale", "Damaged", "Internal use", "Lost"],
  adjustment: ["Cycle count", "Damaged", "Found stock", "Correction"],
};

const TYPES: MovementType[] = ["stock_in", "stock_out", "adjustment"];

/**
 * Stock in / out / adjustment for one product. Stock-out and adjustment show
 * a review step before anything is sent. The submit button is disabled while
 * in flight, and every attempt carries an idempotency key that is reused on
 * retry until the server confirms success.
 */
export function StockMovementForm({
  product,
  initialType = "stock_in",
  onRecorded,
}: {
  product: MovementProduct;
  initialType?: MovementType;
  onRecorded?: (result: MovementResult) => void;
}) {
  const uid = useId();
  const [type, setType] = useState<MovementType>(initialType);
  const [step, setStep] = useState<"edit" | "review">("edit");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const keyRef = useRef<string | null>(null);

  const [state, formAction, pending] = useActionState(async (prev: ActionState<MovementResult>, form: FormData) => {
    keyRef.current ??= newUuid();
    form.set("idempotency_key", keyRef.current);
    const result = await recordMovement(prev, form);
    if (result.status === "success") {
      keyRef.current = null;
      setQuantity("");
      setReference("");
      setStep("edit");
      if (result.data) onRecorded?.(result.data);
    } else {
      setStep("edit");
    }
    return result;
  }, { status: "idle" });

  const serverErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const errors = { ...serverErrors, ...localErrors };
  const current = product.quantity_on_hand;
  const qtyNum = /^\d+$/.test(quantity.trim()) ? Number(quantity.trim()) : NaN;
  const isAdjust = type === "adjustment";
  const delta = Number.isNaN(qtyNum) ? NaN : type === "stock_in" ? qtyNum : type === "stock_out" ? -qtyNum : qtyNum - current;
  const after = current + (Number.isNaN(delta) ? 0 : delta);

  function validate(): boolean {
    const e: Record<string, string> = {};
    const max = isAdjust ? MAX_QTY : MAX_MOVE_QTY;
    const min = isAdjust ? 0 : 1;
    if (Number.isNaN(qtyNum)) e.quantity = isAdjust ? "Enter the counted quantity as a whole number." : "Enter a whole number.";
    else if (qtyNum < min || qtyNum > max) e.quantity = `Enter a number from ${min} to ${formatInt(max)}.`;
    else if (type === "stock_out" && qtyNum > current) e.quantity = `Only ${formatInt(current)} ${product.unit} available.`;
    else if (isAdjust && qtyNum === current) e.quantity = "That matches the current quantity. Nothing to adjust.";
    if (!reason.trim()) e.reason = "Choose or type a reason.";
    setLocalErrors(e);
    return Object.keys(e).length === 0;
  }

  function switchType(t: MovementType) {
    setType(t);
    setStep("edit");
    setReason("");
    setLocalErrors({});
  }

  if (!product.is_active) {
    return (
      <Alert tone="warning" title="Archived product">
        Restore this product before recording stock changes.
      </Alert>
    );
  }

  const qId = `${uid}-qty`;
  const rId = `${uid}-reason`;
  const refId = `${uid}-ref`;

  return (
    <div className="space-y-4">
      <div role="radiogroup" aria-label="Movement type" className="grid grid-cols-3 gap-1 rounded-lg bg-canvas p-1">
        {TYPES.map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={type === t}
            onClick={() => switchType(t)}
            className={cx(
              "min-h-9 rounded-md px-2 text-sm font-semibold transition-colors duration-150",
              type === t ? "bg-white text-ink shadow-sm" : "text-ink/60 hover:text-ink",
            )}
          >
            {t === "adjustment" ? "Adjust" : MOVEMENT_LABELS[t]}
          </button>
        ))}
      </div>

      <div aria-live="polite" aria-atomic="true">
        {state.status === "success" && state.data && (
          <Alert tone="success" title={state.message}>
            <p>
              {MOVEMENT_LABELS[state.data.type]} {formatDelta(state.data.delta)} {product.unit}. New balance:{" "}
              <strong>{formatInt(state.data.balanceAfter)}</strong>.{" "}
              <Link href={`/movements?product=${product.id}`} className="font-semibold underline">
                View history
              </Link>
            </p>
          </Alert>
        )}
        {state.status === "error" && (
          <Alert tone="error" title={state.message} role="alert" />
        )}
      </div>

      <form action={formAction} noValidate className="space-y-4">
        <input type="hidden" name="product_id" value={product.id} />
        <input type="hidden" name="movement_type" value={type} />
        <input type="hidden" name="quantity" value={quantity} />
        <input type="hidden" name="reason" value={reason} />
        <input type="hidden" name="reference" value={reference} />

        {step === "edit" ? (
          <>
            <p className="text-sm text-ink/60">
              Current quantity: <strong className="text-ink">{formatInt(current)}</strong> {product.unit}
              {product.locationLabel ? <> · Location: <strong className="text-ink">{product.locationLabel}</strong></> : null}
            </p>
            <Field
              id={qId}
              label={isAdjust ? "Counted quantity" : type === "stock_in" ? "Quantity to add" : "Quantity to remove"}
              required
              error={errors.quantity}
              hint={isAdjust ? "Enter what you physically counted. The difference is recorded." : `Whole ${product.unit}, 1 to ${formatInt(MAX_MOVE_QTY)}.`}
            >
              <input
                id={qId}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={inputClass}
                {...describedBy(qId, { hint: true, error: errors.quantity })}
              />
            </Field>
            <Field id={rId} label="Reason" required error={errors.reason}>
              <div className="mb-2 flex flex-wrap gap-2">
                {REASONS[type].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(r)}
                    aria-pressed={reason === r}
                    className={cx(
                      "min-h-9 rounded-full px-3 text-xs font-medium ring-1 ring-inset",
                      reason === r ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-ink/80 ring-ink/20 hover:bg-paper",
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <input
                id={rId}
                maxLength={200}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={inputClass}
                {...describedBy(rId, { error: errors.reason })}
              />
            </Field>
            <Field id={refId} label="Reference / note" error={errors.reference} hint="For example an order or delivery number.">
              <input
                id={refId}
                maxLength={200}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className={inputClass}
                {...describedBy(refId, { hint: true, error: errors.reference })}
              />
            </Field>

            {type === "stock_in" ? (
              <Button
                type="submit"
                disabled={pending}
                className="w-full sm:w-auto"
                onClick={(e) => {
                  if (!validate()) e.preventDefault();
                }}
              >
                {pending ? "Recording…" : "Record stock in"}
              </Button>
            ) : (
              <Button type="button" className="w-full sm:w-auto" onClick={() => validate() && setStep("review")}>
                Review {isAdjust ? "adjustment" : "stock out"}
              </Button>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-ink/10 bg-paper p-4 text-sm">
              <p className="font-semibold text-ink">Confirm {isAdjust ? "adjustment" : "stock out"}</p>
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                <dt className="text-ink/60">Product</dt>
                <dd className="font-medium">
                  {product.name} <span className="text-ink/60">({product.sku})</span>
                </dd>
                <dt className="text-ink/60">Current</dt>
                <dd className="tabular-nums">{formatInt(current)} {product.unit}</dd>
                <dt className="text-ink/60">Change</dt>
                <dd className={cx("font-semibold tabular-nums", delta > 0 ? "text-emerald-700" : "text-red-700")}>
                  {formatDelta(delta)} {product.unit}
                </dd>
                <dt className="text-ink/60">New quantity</dt>
                <dd className="font-semibold tabular-nums">{formatInt(after)} {product.unit}</dd>
                <dt className="text-ink/60">Reason</dt>
                <dd>{reason}</dd>
                {reference && (
                  <>
                    <dt className="text-ink/60">Reference</dt>
                    <dd>{reference}</dd>
                  </>
                )}
              </dl>
              <p className="mt-3 text-xs text-ink/60">
                The server re-checks the live quantity. If stock changed in the meantime, nothing is saved and you will see the latest number.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant={type === "stock_out" ? "danger" : "primary"} disabled={pending} autoFocus>
                {pending ? "Recording…" : `Confirm ${isAdjust ? "adjustment" : "stock out"}`}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setStep("edit")} disabled={pending}>
                Back
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
