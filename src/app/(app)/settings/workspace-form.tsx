"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Alert, describedBy, Field, inputClass } from "@/components/ui";
import { renameWorkspace } from "./actions";

export function WorkspaceForm({ name }: { name: string }) {
  const [state, formAction] = useActionState(renameWorkspace, { status: "idle" });
  const error = state.status === "error" ? state.fieldErrors?.name : undefined;
  const value = state.status === "error" ? (state.values?.name ?? name) : name;
  return (
    <form key={state.status === "idle" ? "idle" : JSON.stringify(state)} action={formAction} noValidate className="space-y-4">
      <div aria-live="polite">
        {state.status === "error" && <Alert tone="error" role="alert">{state.message}</Alert>}
        {state.status === "success" && <Alert tone="success">{state.message}</Alert>}
      </div>
      <Field id="ws-name" label="Workspace name" required error={error}>
        <input id="ws-name" name="name" defaultValue={value} maxLength={100} className={inputClass} {...describedBy("ws-name", { error })} />
      </Field>
      <SubmitButton>Save</SubmitButton>
    </form>
  );
}
