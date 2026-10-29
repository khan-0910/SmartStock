"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";
import { fieldErrors, formFields } from "@/lib/validation";

const credentials = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.")),
  password: z.string().min(8, "Password must be at least 8 characters.").max(72, "Password must be 72 characters or fewer."),
});

/** Only allow same-site relative redirects after sign-in. */
function safeNext(value: string) {
  return value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : "/dashboard";
}

/** supabase-js reports an unreachable server as status 0 / "fetch failed". */
function isNetworkError(error: { status?: number; message: string; name?: string }) {
  return error.status === 0 || error.name === "AuthRetryableFetchError" || /fetch failed|network|ENOTFOUND|ECONN/i.test(error.message);
}

const UNREACHABLE = isSupabaseConfigured()
  ? "Could not reach the sign-in service. Check your connection and try again."
  : "Supabase is not set up yet. Put your project URL and anon key in .env.local, then restart the dev server.";

export async function signIn(_prev: ActionState, form: FormData): Promise<ActionState> {
  const raw = formFields(form, ["email", "password", "next"]);
  const parsed = credentials.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", message: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error), values: { email: raw.email } };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (isNetworkError(error)) return { status: "error", message: UNREACHABLE, values: { email: raw.email } };
    const unconfirmed = /not confirmed/i.test(error.message);
    return {
      status: "error",
      message: unconfirmed ? "Please confirm your email address first, then sign in." : "Email or password is incorrect.",
      values: { email: raw.email },
    };
  }
  redirect(safeNext(raw.next));
}

export async function signUp(_prev: ActionState, form: FormData): Promise<ActionState> {
  const raw = formFields(form, ["email", "password"]);
  const parsed = credentials.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", message: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error), values: { email: raw.email } };
  }
  const h = await headers();
  const origin = h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${origin}/auth/confirm` },
  });
  if (error) {
    const message = isNetworkError(error)
      ? UNREACHABLE
      : /already registered|already exists/i.test(error.message)
      ? "An account with this email already exists. Try signing in."
      : /rate limit/i.test(error.message)
        ? "Too many attempts. Please wait a minute and try again."
        : error.message;
    return { status: "error", message, values: { email: raw.email } };
  }
  // Email confirmation disabled in Supabase: session exists, go straight in.
  if (data.session) redirect("/dashboard");
  return { status: "success", message: "Check your inbox for a confirmation link, then sign in." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
