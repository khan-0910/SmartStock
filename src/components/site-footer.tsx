import Link from "next/link";
import { site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="bg-ink text-paper">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" width={28} height={28} />
            <span className="font-display text-xl font-bold tracking-tight">SmartStock</span>
          </Link>
          <p className="mt-4 max-w-xs text-sm text-paper/60">Inventory for small warehouses and shops. Every unit counted, every change on record.</p>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-wide text-lime uppercase">Product</p>
          <ul className="mt-4 space-y-2 text-sm text-paper/70">
            <li><Link href="/#features" className="hover:text-paper">Features</Link></li>
            <li><Link href="/#how" className="hover:text-paper">How it works</Link></li>
            <li><Link href="/signup" className="hover:text-paper">Create account</Link></li>
            <li><Link href="/login" className="hover:text-paper">Sign in</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-wide text-coral uppercase">Legal</p>
          <ul className="mt-4 space-y-2 text-sm text-paper/70">
            <li><Link href="/privacy" className="hover:text-paper">Privacy Policy</Link></li>
            <li><Link href="/terms" className="hover:text-paper">Terms of Service</Link></li>
            <li><Link href="/cookies" className="hover:text-paper">Cookie Policy</Link></li>
            <li><Link href="/security" className="hover:text-paper">Security</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-wide text-sun uppercase">Contact</p>
          <ul className="mt-4 space-y-2 text-sm text-paper/70">
            <li><a href={`mailto:${site.contactEmail}`} className="hover:text-paper">{site.contactEmail}</a></li>
            <li><a href={`mailto:${site.securityEmail}`} className="hover:text-paper">Report a vulnerability</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-paper/50 sm:flex-row sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} {site.name}. All rights reserved.</p>
          <p>
            Photos from <a href="https://unsplash.com" className="underline hover:text-paper" rel="noopener noreferrer" target="_blank">Unsplash</a>. No ads, no trackers.
          </p>
        </div>
      </div>
    </footer>
  );
}
