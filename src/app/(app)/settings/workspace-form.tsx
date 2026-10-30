"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Alert, describedBy, Field, inputClass } from "@/components/ui";
import { CURRENCIES } from "@/lib/format";
import { saveWorkspace } from "./actions";

export function WorkspaceForm({ name, currency }: { name: string; currency: string }) {
  const [state, formAction] = useActionState(saveWorkspace, { status: "idle" });
  const error = state.status === "error" ? state.fieldErrors?.name : undefined;
  const currencyError = state.status === "error" ? state.fieldErrors?.currency : undefined;
  const value = state.status === "error" ? (state.values?.name ?? name) : name;
  const currencyValue = state.status === "error" ? (state.values?.currency ?? currency) : currency;
  return (
    <form key={state.status === "idle" ? "idle" : JSON.stringify(state)} action={formAction} noValidate className="space-y-4">
      <div aria-live="polite">
        {state.status === "error" && <Alert tone="error" role="alert">{state.message}</Alert>}
        {state.status === "success" && <Alert tone="success">{state.message}</Alert>}
      </div>
      <Field id="ws-name" label="Workspace name" required error={error}>
        <input id="ws-name" name="name" defaultValue={value} maxLength={100} className={inputClass} {...describedBy("ws-name", { error })} />
      </Field>
      <Field
        id="ws-currency"
        label="Currency"
        required
        error={currencyError}
        hint="Used to display prices and inventory value. Changing it does not convert amounts you have already entered."
      >
        <select id="ws-currency" name="currency" defaultValue={currencyValue} className={inputClass} {...describedBy("ws-currency", { hint: true, error: currencyError })}>
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} · {c.label}
            </option>
          ))}
        </select>
      </Field>
      <SubmitButton>Save</SubmitButton>
    </form>
  );
}
