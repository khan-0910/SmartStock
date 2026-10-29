"use client";

import { useActionState } from "react";
import type { ActionState, Location } from "@/lib/types";
import { SubmitButton } from "./submit-button";
import { Alert, describedBy, Field, inputClass, LinkButton } from "./ui";

export function LocationForm({
  action,
  location,
}: {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  location?: Location;
}) {
  const [state, formAction] = useActionState(action, { status: "idle" });
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const values =
    state.status === "error" && state.values
      ? state.values
      : { code: location?.code ?? "", name: location?.name ?? "", description: location?.description ?? "" };
  // New key after each result so inputs reset (success) or keep typed values (error).
  const key = state.status === "idle" ? "idle" : JSON.stringify(state);
  const prefix = location ? `loc-${location.id}` : "loc-new";

  return (
    <form key={key} action={formAction} noValidate className="space-y-4">
      <div aria-live="polite">
        {state.status === "error" && (
          <Alert tone="error" role="alert">
            {state.message}
          </Alert>
        )}
        {state.status === "success" && <Alert tone="success">{state.message}</Alert>}
      </div>
      <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
        <Field id={`${prefix}-code`} label="Code" required error={errors.code} hint="e.g. A-01-03. Stored in capitals.">
          <input
            id={`${prefix}-code`}
            name="code"
            defaultValue={values.code}
            maxLength={32}
            autoComplete="off"
            className={`${inputClass} font-mono uppercase`}
            {...describedBy(`${prefix}-code`, { hint: true, error: errors.code })}
          />
        </Field>
        <Field id={`${prefix}-name`} label="Name" required error={errors.name}>
          <input
            id={`${prefix}-name`}
            name="name"
            defaultValue={values.name}
            maxLength={100}
            autoComplete="off"
            className={inputClass}
            {...describedBy(`${prefix}-name`, { error: errors.name })}
          />
        </Field>
      </div>
      <Field id={`${prefix}-description`} label="Description" error={errors.description}>
        <input
          id={`${prefix}-description`}
          name="description"
          defaultValue={values.description}
          maxLength={500}
          autoComplete="off"
          className={inputClass}
          {...describedBy(`${prefix}-description`, { error: errors.description })}
        />
      </Field>
      <div className="flex gap-2">
        <SubmitButton>{location ? "Save location" : "Add location"}</SubmitButton>
        {location && (
          <LinkButton href="/locations" variant="secondary">
            Cancel
          </LinkButton>
        )}
      </div>
    </form>
  );
}
