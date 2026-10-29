import type { Metadata } from "next";
import { signUp } from "../actions";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <>
      <h1 className="mb-1 text-lg font-semibold">Create your account</h1>
      <p className="mb-5 text-sm text-slate-600">A personal workspace is set up for you on first sign-in.</p>
      <AuthForm mode="signup" action={signUp} />
    </>
  );
}
