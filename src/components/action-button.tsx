"use client";

import { useRef, useState, useTransition } from "react";
import type { ActionState } from "@/lib/types";
import { Alert, Button, type ButtonVariant } from "./ui";

/**
 * Runs a server action from a button, optionally behind a confirmation
 * dialog. Uses native <dialog>: focus is trapped while open, Escape closes
 * it, and focus returns to the trigger.
 */
export function ActionButton({
  action,
  label,
  pendingLabel = "Working…",
  variant = "secondary",
  confirm,
}: {
  action: () => Promise<ActionState>;
  label: string;
  pendingLabel?: string;
  variant?: ButtonVariant;
  confirm?: { title: string; body: string; confirmLabel: string; danger?: boolean };
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionState>({ status: "idle" });

  function run() {
    dialogRef.current?.close();
    startTransition(async () => {
      setResult(await action());
    });
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant={variant} disabled={pending} onClick={() => (confirm ? dialogRef.current?.showModal() : run())}>
        {pending ? pendingLabel : label}
      </Button>
      <div aria-live="polite">
        {result.status === "error" && <Alert tone="error" role="alert">{result.message}</Alert>}
        {result.status === "success" && <Alert tone="success">{result.message}</Alert>}
      </div>
      {confirm && (
        <dialog
          ref={dialogRef}
          aria-labelledby="confirm-title"
          className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-[1.75rem] border-2 border-ink bg-paper p-0 text-ink shadow-[8px_8px_0_0_var(--color-ink)] backdrop:bg-ink/50 open:animate-[pop_0.45s_var(--ease-out-expo)_both]"
        >
          <div className="space-y-3 p-5">
            <h2 id="confirm-title" className="font-display text-xl font-bold">
              {confirm.title}
            </h2>
            <p className="text-sm text-ink/60">{confirm.body}</p>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => dialogRef.current?.close()} autoFocus>
                Cancel
              </Button>
              <Button type="button" variant={confirm.danger ? "danger" : "primary"} onClick={run}>
                {confirm.confirmLabel}
              </Button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
