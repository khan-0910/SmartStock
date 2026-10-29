import { LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="text-2xl font-bold">Not found</h1>
      <p className="mt-2 text-slate-600">That page or record does not exist in your workspace.</p>
      <LinkButton href="/dashboard" className="mt-6">
        Go to dashboard
      </LinkButton>
    </main>
  );
}
