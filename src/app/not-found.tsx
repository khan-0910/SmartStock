import { LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-4 py-20 text-center">
      <p className="font-display text-8xl font-extrabold text-coral">404</p><h1 className="mt-2 font-display text-3xl font-bold">Not found</h1>
      <p className="mt-2 text-ink/60">That page or record does not exist in your workspace.</p>
      <LinkButton href="/dashboard" className="mt-6">
        Go to dashboard
      </LinkButton>
    </main>
  );
}
