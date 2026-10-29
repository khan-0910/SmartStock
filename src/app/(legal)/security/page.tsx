import type { Metadata } from "next";
import Link from "next/link";
import { LandingMotion } from "@/components/landing/landing-motion";
import CircularText from "@/components/react-bits/CircularText";
import { SiteFooter } from "@/components/site-footer";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Security", description: "How SmartStock protects your account and inventory data, and how to report a vulnerability." };

// Outside-in: what a request passes through before it can touch your stock.
const LAYERS = [
  {
    name: "Your browser",
    color: "bg-lilac",
    body: "A strict, per-request Content Security Policy only runs scripts carrying a fresh one-time nonce. No framing, no MIME sniffing, camera allowed only on this site.",
  },
  {
    name: "The edge",
    color: "bg-sun",
    body: "Every request refreshes and checks your session. HTTPS with HSTS in production. Sign-in, sign-up and stock changes are rate-limited.",
  },
  {
    name: "The server",
    color: "bg-teal",
    body: "Each page and action re-verifies who you are. Input is validated, and your user, workspace and quantities are never taken from the browser.",
  },
  {
    name: "The database",
    color: "bg-coral",
    body: "Row-level security on every table checks workspace membership for each read and write, so a hand-crafted request still only reaches your rows.",
  },
  {
    name: "The ledger",
    color: "bg-lime",
    body: "Stock changes only through one locked, all-or-nothing database function. History cannot be edited or deleted, even by the table owner.",
  },
];

const PROTECTIONS = [
  { icon: "M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z", title: "Workspace isolation", body: "PostgreSQL row-level security on every table. Anonymous visitors get nothing.", color: "bg-lime" },
  { icon: "M7 11V8a5 5 0 0110 0v3M5 11h14v10H5z", title: "Strong sign-in", body: "Hashed passwords, 10+ characters with letters and numbers, HTTP-only session cookies.", color: "bg-lilac" },
  { icon: "M4 6h16M4 12h10M4 18h6", title: "Rate limits", body: "Repeated sign-in, sign-up, export and stock requests are slowed down per IP and per account.", color: "bg-sun" },
  { icon: "M8 9l-4 3 4 3M16 9l4 3-4 3M13 6l-2 12", title: "Script lockdown", body: "Nonce-based CSP with strict-dynamic blocks injected scripts; forms post only to this site.", color: "bg-coral" },
  { icon: "M12 8v4l3 2M3 12a9 9 0 109-9", title: "Tamper-proof history", body: "Append-only movements with before/after balances, actor and time. Corrections are new entries.", color: "bg-teal" },
  { icon: "M4 7h16v10H4zM9 12h6", title: "No secrets in browsers", body: "No admin or service keys are ever shipped to clients. The app runs on your own session.", color: "bg-lilac" },
];

const NEVER = ["Sell or rent your data", "Run ads or third-party trackers", "Record or upload camera frames", "Let anyone edit stock history", "Ship secret keys to your browser"];

export default function SecurityPage() {
  return (
    <LandingMotion className="landing min-h-dvh overflow-x-clip bg-paper text-ink">
      <header data-header className="fixed inset-x-0 top-3 z-50 px-3">
        <nav aria-label="Main" className="mx-auto flex h-14 max-w-6xl items-center justify-between rounded-full border border-ink/10 bg-paper/90 px-3 pl-5 shadow-[0_8px_30px_-12px_rgba(19,17,28,0.25)]">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" width={26} height={26} />
            <span className="font-display text-lg font-bold tracking-tight">SmartStock</span>
          </Link>
          <div className="flex items-center gap-1 text-sm font-semibold">
            <Link href="/privacy" className="hidden rounded-full px-4 py-2 text-ink/70 hover:text-ink sm:inline-flex">Privacy</Link>
            <a href="#report" className="rounded-full bg-ink px-4 py-2 whitespace-nowrap text-paper hover:bg-brand-600">Report an issue</a>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section data-hero className="relative isolate overflow-hidden bg-ink pt-36 pb-24 text-paper lg:pt-44 lg:pb-32">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(40rem_28rem_at_80%_30%,rgba(91,61,245,0.55),transparent_65%),radial-gradient(30rem_20rem_at_10%_100%,rgba(46,196,182,0.35),transparent_60%)]" />
          <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <p data-hero-fade className="text-sm font-bold tracking-[0.14em] text-lime uppercase">Security</p>
              <h1 className="mt-4 font-display text-[clamp(2.8rem,7vw,6rem)] leading-[0.92] font-extrabold tracking-[-0.045em]">
                <span data-hero-title className="block">Security you can</span>
                <span data-hero-fade className="mt-1 block font-serif font-normal italic text-lime">actually check.</span>
              </h1>
              <p data-hero-fade className="mt-7 max-w-xl text-lg leading-relaxed text-paper/70">
                Inventory you can trust needs a system you can trust. Every request passes five layers of protection before it can touch a
                single unit of your stock. Here they are.
              </p>
              <div data-hero-fade className="mt-9 flex flex-wrap gap-3">
                <a data-magnetic href="#layers" className="inline-flex h-12 items-center rounded-full bg-lime px-7 font-bold text-ink">
                  See the layers ↓
                </a>
                <a data-magnetic href="#report" className="inline-flex h-12 items-center rounded-full border-2 border-paper/30 px-7 font-bold hover:border-paper">
                  Report a vulnerability
                </a>
              </div>
            </div>

            {/* Animated shield */}
            <div data-hero-fade aria-hidden className="relative mx-auto size-72 sm:size-96">
              <div className="absolute inset-0 animate-[spin_40s_linear_infinite] rounded-full border-2 border-dashed border-paper/20" />
              <div className="absolute inset-8 animate-[spin_28s_linear_infinite_reverse] rounded-full border-2 border-dashed border-lime/40" />
              <div className="absolute inset-16 rounded-full bg-brand-600/30" />
              <svg viewBox="0 0 24 24" className="absolute inset-0 m-auto size-40 sm:size-48" fill="none">
                <path d="M12 2.5l8 3.6v5.6c0 5-3.4 8.6-8 9.8-4.6-1.2-8-4.8-8-9.8V6.1z" fill="var(--color-lime)" stroke="var(--color-ink)" strokeWidth="1.2" strokeLinejoin="round" />
                <path d="M8.3 12.2l2.6 2.6 5-5.2" stroke="var(--color-ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="absolute -right-2 -bottom-2 sm:right-0 sm:bottom-2">
                <CircularText text="ROW-LEVEL SECURITY ✦ NONCE CSP ✦ RATE LIMITS ✦ " size={128} fontSize={11} fontWeight={800} spinDuration={16} color="#13111c" className="rounded-full bg-coral" />
              </div>
            </div>
          </div>
        </section>

        {/* Layers (pinned on desktop) */}
        <section id="layers" data-layers aria-labelledby="layers-title" className="mx-auto flex min-h-dvh max-w-7xl scroll-mt-0 flex-col justify-center px-4 py-24 sm:px-6 lg:py-0">
          <p data-reveal className="text-sm font-bold tracking-wide text-brand-600 uppercase">Defence in depth</p>
          <h2 id="layers-title" data-split className="mt-3 max-w-3xl font-display text-[clamp(2.2rem,5vw,4rem)] leading-[1] font-extrabold tracking-[-0.035em]">
            Five layers between the internet <span className="font-serif font-normal italic text-coral">and your stock.</span>
          </h2>
          <div className="mt-8 grid items-center gap-12 lg:grid-cols-2">
            <div aria-hidden className="relative mx-auto h-[24rem] w-full max-w-md [perspective:1200px] sm:h-[26rem]">
              {LAYERS.map((l, i) => (
                <div key={l.name} data-plate className="absolute inset-x-0 bottom-6 flex justify-center will-change-transform" style={{ zIndex: LAYERS.length - i }}>
                  <div className={`flex h-36 w-64 items-center justify-center rounded-3xl border-2 border-ink shadow-[0_18px_0_-6px_rgba(19,17,28,0.9)] [transform:rotateX(58deg)_rotateZ(-38deg)] sm:w-72 ${l.color}`}>
                    <span className="font-display text-lg font-extrabold [transform:rotateZ(0deg)]">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                </div>
              ))}
            </div>
            <ol className="space-y-3">
              {LAYERS.map((l, i) => (
                <li key={l.name} data-layer-note className="flex gap-4 rounded-2xl border-2 border-ink/10 bg-white p-4">
                  <span className={`inline-flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-ink font-mono text-sm font-bold ${l.color}`}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="font-display text-xl font-bold">{l.name}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-ink/70">{l.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Protections grid */}
        <section className="bg-ink py-28 text-paper lg:py-36">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <h2 data-split className="max-w-3xl font-display text-[clamp(2.2rem,5vw,4rem)] leading-[1] font-extrabold tracking-[-0.035em]">
              What protects you, <span className="font-serif font-normal italic text-lime">in plain words.</span>
            </h2>
            <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {PROTECTIONS.map((p, i) => (
                <article
                  key={p.title}
                  data-reveal
                  className={`group rounded-[1.75rem] border-2 border-ink p-7 text-ink shadow-[6px_6px_0_0_var(--color-paper)] transition-[transform,box-shadow] duration-300 hover:-translate-y-1.5 hover:rotate-0 hover:shadow-[10px_10px_0_0_var(--color-paper)] ${p.color} ${i % 2 ? "rotate-1" : "-rotate-1"}`}
                >
                  <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-ink text-paper transition-transform duration-500 group-hover:rotate-[-12deg] group-hover:scale-110">
                    <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                      <path d={p.icon} />
                    </svg>
                  </span>
                  <h3 className="mt-6 font-display text-2xl font-extrabold tracking-tight">{p.title}</h3>
                  <p className="mt-2 leading-relaxed text-ink/80">{p.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* What we never do */}
        <section className="mx-auto grid max-w-7xl gap-12 px-4 py-28 sm:px-6 lg:grid-cols-2 lg:py-36">
          <div>
            <p data-reveal className="text-sm font-bold tracking-wide text-brand-600 uppercase">Promises</p>
            <h2 data-split className="mt-3 font-display text-[clamp(2.2rem,5vw,3.75rem)] leading-[1] font-extrabold tracking-[-0.035em]">
              Things we will <span className="font-serif font-normal italic text-coral">never</span> do.
            </h2>
            <p data-reveal className="mt-5 max-w-md text-ink/70">
              Read the full <Link href="/privacy" className="font-semibold text-brand-700 underline">Privacy Policy</Link> and{" "}
              <Link href="/cookies" className="font-semibold text-brand-700 underline">Cookie Policy</Link>.
            </p>
          </div>
          <ul className="space-y-3">
            {NEVER.map((n) => (
              <li key={n} data-reveal className="flex items-center gap-4 rounded-2xl border-2 border-ink bg-white px-5 py-4 font-bold transition-colors hover:bg-lime">
                <span aria-hidden className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-coral text-ink">✕</span>
                {n}
              </li>
            ))}
          </ul>
        </section>

        {/* Report */}
        <section id="report" className="relative isolate scroll-mt-20 overflow-hidden bg-coral px-4 py-28 sm:px-6">
          <div className="mx-auto max-w-4xl text-center">
            <h2 data-split className="font-display text-[clamp(2.4rem,6vw,5rem)] leading-[0.95] font-extrabold tracking-[-0.045em]">
              Found a weak spot? <span className="font-serif font-normal italic">Tell us.</span>
            </h2>
            <p data-reveal className="mx-auto mt-6 max-w-2xl text-lg font-medium text-ink/80">
              Email the steps to reproduce. Please give us reasonable time to fix it before disclosing publicly, and do not access or change
              other people&apos;s data while testing. We will acknowledge good-faith reports and will not pursue legal action against
              researchers who follow this policy.
            </p>
            <div data-reveal className="mt-10 flex flex-wrap justify-center gap-3">
              <a data-magnetic href={`mailto:${site.securityEmail}`} className="inline-flex h-13 items-center rounded-full bg-ink px-8 font-bold text-paper">
                {site.securityEmail}
              </a>
              <a href="/.well-known/security.txt" className="inline-flex h-13 items-center rounded-full border-2 border-ink px-8 font-bold hover:bg-ink hover:text-paper">
                security.txt
              </a>
            </div>
            <p data-reveal className="mt-8 text-sm text-ink/70">Last updated {site.legalUpdated}</p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </LandingMotion>
  );
}
