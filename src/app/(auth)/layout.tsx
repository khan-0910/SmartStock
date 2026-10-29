import Link from "next/link";
import { Alert } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" width={32} height={32} />
          <span className="text-xl font-bold tracking-tight">SmartStock</span>
        </Link>
        {!isSupabaseConfigured() && (
          <div className="mb-4">
            <Alert tone="warning" title="Supabase is not connected" role="alert">
              <p>
                <code>.env.local</code> still has placeholder values, so sign-up and sign-in cannot work. Add your project URL and anon key from
                Supabase → Project Settings → API, then restart <code>npm run dev</code>.
              </p>
            </Alert>
          </div>
        )}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">{children}</div>
      </div>
    </main>
  );
}
