"use client";

import Link from "next/link";
import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Alert, describedBy, Field, inputClass } from "@/components/ui";
import type { ActionState } from "@/lib/types";

type Mode = "login" | "signup";

export function AuthForm({
  mode,
  action,
  next,
  notice,
}: {
  mode: Mode;
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  next?: string;
  notice?: string;
}) {
  const [state, formAction] = useActionState(action, { status: "idle" });
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  const email = state.status === "error" ? state.values?.email : undefined;
  const isLogin = mode === "login";

  if (state.status === "success") {
    return (
      <div className="space-y-4">
        <Alert tone="success" title="Almost there" role="status">
          {state.message}
        </Alert>
        <Link href="/login" className="block text-center text-sm font-semibold text-brand-700 hover:underline">
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {notice && <Alert tone="info">{notice}</Alert>}
      {state.status === "error" && (
        <Alert tone="error" role="alert">
          {state.message}
        </Alert>
      )}
      {next && <input type="hidden" name="next" value={next} />}
      <Field id="email" label="Email" required error={errors?.email}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={email}
          className={inputClass}
          {...describedBy("email", { error: errors?.email })}
        />
      </Field>
      <Field id="password" label="Password" required error={errors?.password} hint={isLogin ? undefined : "At least 10 characters, with at least one letter and one number."}>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={isLogin ? "current-password" : "new-password"}
          required
          minLength={isLogin ? undefined : 10}
          maxLength={72}
          className={inputClass}
          {...describedBy("password", { hint: !isLogin, error: errors?.password })}
        />
      </Field>
      {!isLogin && (
        <p className="text-xs text-ink/60">
          By creating an account you agree to the{" "}
          <Link href="/terms" className="font-semibold underline">Terms of Service</Link> and confirm you have read the{" "}
          <Link href="/privacy" className="font-semibold underline">Privacy Policy</Link>.
        </p>
      )}
      <SubmitButton className="w-full" pendingLabel={isLogin ? "Signing in…" : "Creating account…"}>
        {isLogin ? "Sign in" : "Create account"}
      </SubmitButton>
      <p className="text-center text-sm text-slate-600">
        {isLogin ? "New to SmartStock? " : "Already have an account? "}
        <Link href={isLogin ? "/signup" : "/login"} className="font-semibold text-brand-700 hover:underline">
          {isLogin ? "Create an account" : "Sign in"}
        </Link>
      </p>
    </form>
  );
}
