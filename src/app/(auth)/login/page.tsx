import type { Metadata } from "next";
import { signIn } from "../actions";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <>
      <h1 className="mb-1 text-lg font-semibold">Sign in</h1>
      <p className="mb-5 text-sm text-slate-600">Manage your stock, locations and movement history.</p>
      <AuthForm
        mode="login"
        action={signIn}
        next={next}
        notice={error === "confirm" ? "That confirmation link is invalid or has expired. Sign in, or sign up again for a new link." : undefined}
      />
    </>
  );
}
