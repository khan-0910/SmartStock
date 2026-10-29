import Image from "next/image";
import Link from "next/link";
import { Alert } from "@/components/ui";
import { photos } from "@/lib/site";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-4 py-8 sm:px-10">
        <Link href="/" className="flex items-center gap-2 self-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" width={32} height={32} />
          <span className="font-display text-xl font-bold tracking-tight">SmartStock</span>
        </Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          {!isSupabaseConfigured() && (
            <div className="mb-4">
              <Alert tone="warning" title="Supabase is not connected" role="alert">
                <p>
                  <code>.env.local</code> still has placeholder values, so sign-up and sign-in cannot work. Add your project URL and anon key
                  from Supabase → Project Settings → API, then restart <code>npm run dev</code>.
                </p>
              </Alert>
            </div>
          )}
          {children}
        </div>
        <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink/60">
          <Link href="/privacy" className="hover:text-ink">Privacy</Link>
          <Link href="/terms" className="hover:text-ink">Terms</Link>
          <Link href="/cookies" className="hover:text-ink">Cookies</Link>
          <Link href="/security" className="hover:text-ink">Security</Link>
        </nav>
      </div>

      <div className="relative hidden overflow-hidden bg-ink lg:block">
        <Image src={photos.warehouse.src} alt={photos.warehouse.alt} fill priority sizes="50vw" className="object-cover opacity-80" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
        <div className="absolute inset-x-10 bottom-10 text-paper">
          <p className="font-display text-4xl leading-tight font-bold tracking-tight">
            Every unit counted.
            <br />
            <span className="font-serif font-normal italic text-lime">Every change</span> on record.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-lime px-3 py-1 text-ink">▲ +120 Received</span>
            <span className="rounded-full bg-coral px-3 py-1 text-ink">▼ −5 Sale</span>
            <span className="rounded-full bg-sun px-3 py-1 text-ink">Low stock: 3</span>
          </div>
        </div>
      </div>
    </main>
  );
}
