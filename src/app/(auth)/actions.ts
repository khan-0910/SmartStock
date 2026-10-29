"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { site } from "@/lib/site";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";
import { fieldErrors, formFields } from "@/lib/validation";

const email = z.string().trim().toLowerCase().max(254).pipe(z.email("Enter a valid email address."));

const credentials = z.object({
  email,
  password: z.string().min(1, "Enter your password.").max(72, "Password must be 72 characters or fewer."),
});

// New passwords: long enough to resist guessing, and not trivially simple.
const newCredentials = z.object({
  email,
  password: z
    .string()
    .min(10, "Use at least 10 characters.")
    .max(72, "Password must be 72 characters or fewer.")
    .refine((p) => /[a-z]/i.test(p) && /d/.test(p), "Include at least one letter and one number."),
});

const TOO_MANY = (s: number) => `Too many attempts. Please wait ${s} seconds and try again.`;

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
  // Slow down password guessing per IP and per account.
  const ip = await clientIp();
  const wait = Math.max(rateLimit(`signin:ip:${ip}`, 20, 10 * 60_000), rateLimit(`signin:email:${parsed.data.email}`, 8, 10 * 60_000));
  if (wait) return { status: "error", message: TOO_MANY(wait), values: { email: raw.email } };
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
  const parsed = newCredentials.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", message: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error), values: { email: raw.email } };
  }
  const wait = rateLimit(`signup:ip:${await clientIp()}`, 5, 60 * 60_000);
  if (wait) return { status: "error", message: TOO_MANY(wait), values: { email: raw.email } };
  // Prefer the configured site URL so a spoofed Origin header cannot steer the email link.
  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ? site.url : (h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${origin}/auth/confirm` },
  });
  if (error) {
    const message = isNetworkError(error)
      ? UNREACHABLE
      : /already registered|already exists/i.test(error.message)
      ? "We could not create an account with that email. If you already have one, sign in instead."
      : /rate limit/i.test(error.message)
        ? "Too many attempts. Please wait a minute and try again."
        : /weak|pwned|leaked/i.test(error.message)
          ? "That password is too weak or has appeared in a data breach. Choose another."
          : "We could not create your account. Please try again.";
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
