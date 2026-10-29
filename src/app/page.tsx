import type { Metadata } from "next";
import { Inter_Tight } from "next/font/google";
import Link from "next/link";
import { LandingMotion } from "@/components/landing/landing-motion";

const display = Inter_Tight({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { absolute: "SmartStock — inventory that never disagrees with itself" },
  description:
    "Track products, storage locations and every stock movement. Scan barcodes with a phone camera or USB scanner. Built on an atomic, append-only ledger.",
};

// Deterministic bar widths for the decorative barcode.
const BARS = [3, 1, 2, 1, 1, 3, 2, 1, 1, 2, 3, 1, 1, 1, 2, 2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 2, 1, 1, 3, 1, 2, 2, 1, 1, 2, 1, 3, 1, 1];

const BAR_X = BARS.map((_, i) => BARS.slice(0, i).reduce((a, b) => a + b, 0));
const BAR_TOTAL = BARS.reduce((a, b) => a + b, 0);

function Barcode({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox={`0 0 ${BAR_TOTAL} 40`} preserveAspectRatio="none" className={className} fill="currentColor">
      {BARS.map((w, i) => (i % 2 === 0 ? <rect key={i} x={BAR_X[i]} y={0} width={w} height={40} /> : null))}
    </svg>
  );
}

const FEATURES = [
  {
    title: "Scan three ways",
    body: "Phone camera, USB or Bluetooth scanner, or just type it. Every path lands in the same lookup, and a scan never changes stock on its own.",
    tag: "EAN-13 · EAN-8 · UPC-A · UPC-E · Code 128",
    icon: "M4 7V4h3M17 4h3v3M20 17v3h-3M7 20H4v-3M7 8v8M10 8v8M13 8v8M16 8v8",
    wide: true,
  },
  {
    title: "An atomic ledger",
    body: "Each change locks the product row, checks the live quantity, updates the balance and writes the movement in one transaction. Both happen, or neither does.",
    icon: "M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z M9 12l2 2 4-4",
  },
  {
    title: "Never below zero",
    body: "Stock-out is checked against the real balance at commit time, so two people removing the last unit at once can't both succeed.",
    icon: "M4 20h16M7 16V9M12 16V5M17 16v-4",
  },
  {
    title: "History you can trust",
    body: "Movements record who, when, why, before and after. They can't be edited or deleted. Corrections are new adjustments.",
    icon: "M12 8v4l3 2M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8M3 3v5h5",
  },
  {
    title: "Low-stock at a glance",
    body: "Set a reorder level per product. Anything at or below it is flagged on the dashboard and one click away in the catalog.",
    icon: "M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z",
  },
  {
    title: "Locations that make sense",
    body: "Name bins like A-01-03. Every product has a home, and deactivated locations keep their history intact.",
    icon: "M12 21s7-6.2 7-12a7 7 0 10-14 0c0 5.8 7 12 7 12zM12 11.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
    wide: true,
  },
];

const MARQUEE = [
  "Camera scanning",
  "USB & Bluetooth scanners",
  "Manual entry",
  "Atomic stock movements",
  "Append-only history",
  "Row-level security",
  "Low-stock alerts",
  "Inventory value at cost",
  "Works on phone & desktop",
];

const STEPS = [
  { n: "01", title: "Scan or search", body: "Point a phone at the barcode, pull the trigger on a USB scanner, or type the code. SmartStock finds the exact product in your workspace." },
  { n: "02", title: "Review the change", body: "Pick stock in, stock out or a counted adjustment. You see the current quantity, the change and the result before anything is saved." },
  { n: "03", title: "It's on the record", body: "The database commits the new balance and the movement together. History updates and the dashboard reflects it on the next load." },
];

export default function LandingPage() {
  return (
    <LandingMotion className={`landing ${display.className} min-h-dvh overflow-x-clip bg-[#060912] text-slate-200 antialiased`}>
      <noscript>
        <style>{`.landing [data-hero-title],.landing [data-hero-fade],.landing [data-hero-mock],.landing [data-reveal],.landing [data-split]{visibility:visible!important}`}</style>
      </noscript>

      {/* Header */}
      <header
        data-header
        className="fixed inset-x-0 top-0 z-50 border-b border-transparent transition-[background-color,border-color,backdrop-filter] duration-300 data-scrolled:border-white/10 data-scrolled:bg-[#060912]/70 data-scrolled:backdrop-blur-xl"
      >
        <nav aria-label="Main" className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" width={28} height={28} />
            <span className="text-lg font-semibold tracking-tight">SmartStock</span>
          </Link>
          <ul className="hidden items-center gap-8 text-sm text-slate-400 md:flex">
            <li><a href="#features" className="transition-colors hover:text-white">Features</a></li>
            <li><a href="#how" className="transition-colors hover:text-white">How it works</a></li>
            <li><a href="#trust" className="transition-colors hover:text-white">Security</a></li>
          </ul>
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-full px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-white">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-brand-100"
            >
              Get started
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section data-hero className="relative isolate overflow-hidden pt-32 pb-24 sm:pt-40 lg:pb-32">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div data-blob className="absolute top-[-10%] left-[8%] size-[38rem] rounded-full bg-brand-600/30 blur-[120px]" />
            <div data-blob className="absolute top-[20%] right-[-6%] size-[30rem] rounded-full bg-violet-600/20 blur-[120px]" />
            <div data-blob className="absolute bottom-[-20%] left-[35%] size-[28rem] rounded-full bg-emerald-500/15 blur-[120px]" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_50%_30%,black,transparent_70%)]" />
          </div>

          <div data-hero-copy className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <p data-hero-fade className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
              <span className="relative flex size-2">
                <span data-live-dot className="absolute inset-0 rounded-full bg-emerald-400" />
                <span className="relative size-2 rounded-full bg-emerald-400" />
              </span>
              Inventory for small warehouses and shops
            </p>
            <h1 data-hero-title className="text-[clamp(2.6rem,7vw,5.5rem)] leading-[0.98] font-semibold tracking-[-0.04em] text-white">
              Every unit counted. <span className="text-brand-100/60">Every change</span> on record.
            </h1>
            <p data-hero-fade className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-slate-400">
              SmartStock tracks your products, where they live, and every stock movement. Scan a barcode, confirm the change, and the
              balance and its audit trail are saved together.
            </p>
            <div data-hero-fade className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link
                data-magnetic
                href="/signup"
                className="group inline-flex h-12 items-center gap-2 rounded-full bg-brand-600 px-7 text-sm font-semibold text-white shadow-[0_0_40px_-8px] shadow-brand-600 transition-colors hover:bg-brand-700"
              >
                Create free account
                <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </Link>
              <a
                data-magnetic
                href="#how"
                className="inline-flex h-12 items-center rounded-full border border-white/15 px-7 text-sm font-semibold text-white transition-colors hover:bg-white/5"
              >
                See how it works
              </a>
            </div>
          </div>

          {/* Product preview */}
          <div data-hero-parallax className="mx-auto mt-20 max-w-6xl px-4 [perspective:1600px] sm:px-6">
            <div data-hero-tilt className="[transform-style:preserve-3d]">
              <div
                data-hero-mock
                role="img"
                aria-label="Illustrative preview of the SmartStock dashboard with metrics, a barcode scanner and recent stock movements."
                className="rounded-2xl border border-white/10 bg-[#0b1120]/90 p-2 shadow-[0_40px_120px_-30px_rgba(31,95,209,0.55)] ring-1 ring-white/5 backdrop-blur"
              >
                <div className="flex items-center gap-2 px-3 py-2">
                  <span className="size-2.5 rounded-full bg-white/15" />
                  <span className="size-2.5 rounded-full bg-white/15" />
                  <span className="size-2.5 rounded-full bg-white/15" />
                  <span className="ml-3 text-xs text-slate-500">Dashboard · illustrative preview</span>
                </div>
                <div aria-hidden className="grid gap-2 rounded-xl bg-[#080d19] p-3 sm:p-4 lg:grid-cols-[1fr_1fr_1fr_1fr]">
                  {[
                    { label: "Active products", to: 248 },
                    { label: "Units on hand", to: 12904 },
                    { label: "Inventory value", to: 48210, prefix: "$" },
                    { label: "Low stock", to: 6, warn: true },
                  ].map((m) => (
                    <div key={m.label} data-mock-card className="rounded-lg border border-white/5 bg-white/[0.03] p-3 sm:p-4">
                      <p className="text-[11px] text-slate-500 sm:text-xs">{m.label}</p>
                      <p className={`mt-1 text-xl font-semibold tabular-nums sm:text-2xl ${m.warn ? "text-amber-300" : "text-white"}`}>
                        <span data-hero-count data-to={m.to} data-prefix={m.prefix}>
                          {(m.prefix ?? "") + m.to.toLocaleString("en-US")}
                        </span>
                      </p>
                    </div>
                  ))}

                  <div data-mock-card className="relative overflow-hidden rounded-lg border border-white/5 bg-white/[0.03] p-4 lg:col-span-1">
                    <p className="text-xs text-slate-500">Scanner</p>
                    <div className="relative mt-3 rounded-md bg-white px-4 py-5 text-slate-900">
                      <Barcode className="h-16 w-full" />
                      <p className="mt-2 text-center font-mono text-[11px] tracking-[0.2em]">0200000000011</p>
                      <div data-beam className="absolute inset-x-2 top-0 h-0.5 rounded-full bg-red-500 shadow-[0_0_12px_2px_rgba(239,68,68,0.7)]" />
                    </div>
                    <p className="mt-3 text-xs text-emerald-300">✓ Ceramic mug, 350 ml · 48 on hand</p>
                  </div>

                  <div data-mock-card className="rounded-lg border border-white/5 bg-white/[0.03] p-4 lg:col-span-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-500">Recent movements</p>
                      <p className="text-xs text-slate-600">Newest first</p>
                    </div>
                    <ul className="mt-3 space-y-1.5 text-xs sm:text-sm">
                      {[
                        { p: "Ceramic mug, 350 ml", t: "Stock out", d: "−5", r: "Sale · Order 1001", up: false, ba: "48 → 43" },
                        { p: "Packing tape, 48 mm", t: "Stock in", d: "+120", r: "Received", up: true, ba: "0 → 120" },
                        { p: "Dot-grid notebook, A5", t: "Adjustment", d: "−2", r: "Cycle count", up: false, ba: "75 → 73" },
                        { p: "Thermal labels", t: "Stock in", d: "+9", r: "Opening balance", up: true, ba: "0 → 9" },
                      ].map((row) => (
                        <li key={row.p} data-mock-row className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md px-2 py-2 sm:grid-cols-[1.4fr_0.8fr_1fr_auto]">
                          <span className="truncate text-slate-200">{row.p}</span>
                          <span className="hidden text-slate-500 sm:block">{row.t}</span>
                          <span className="hidden truncate text-slate-500 sm:block">{row.r}</span>
                          <span className={`text-right font-semibold tabular-nums ${row.up ? "text-emerald-300" : "text-rose-300"}`}>
                            {row.up ? "▲" : "▼"} {row.d} <span className="ml-2 font-normal text-slate-500">{row.ba}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Marquee */}
        <section aria-label="Capabilities" className="border-y border-white/5 bg-white/[0.015] py-6">
          <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
            <div data-marquee className="flex w-max">
              {[0, 1].map((copy) => (
                <ul key={copy} aria-hidden={copy === 1} className="flex shrink-0 items-center">
                  {MARQUEE.map((item) => (
                    <li key={item} className="flex items-center gap-8 pr-8 text-sm font-medium whitespace-nowrap text-slate-400 sm:text-base">
                      {item}
                      <span aria-hidden className="text-brand-600">✦</span>
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-28 sm:px-6 lg:py-36">
          <p data-reveal className="text-sm font-semibold tracking-wide text-brand-100/70 uppercase">Features</p>
          <h2 data-split className="mt-3 max-w-3xl text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.05] font-semibold tracking-[-0.03em] text-white">
            Everything a small stockroom needs. Nothing it doesn&apos;t.
          </h2>
          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {FEATURES.map((f) => (
              <article
                key={f.title}
                data-reveal
                data-spot
                className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-7 transition-colors hover:border-white/20 ${f.wide ? "md:col-span-2" : ""}`}
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{ background: "radial-gradient(420px circle at var(--x, 50%) var(--y, 50%), rgba(31,95,209,0.22), transparent 60%)" }}
                />
                <div className="relative">
                  <span className="inline-flex size-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-brand-100">
                    <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                      <path d={f.icon} />
                    </svg>
                  </span>
                  <h3 className="mt-6 text-xl font-semibold tracking-tight text-white">{f.title}</h3>
                  <p className="mt-2 max-w-xl leading-relaxed text-slate-400">{f.body}</p>
                  {f.tag && <p className="mt-5 font-mono text-xs text-slate-500">{f.tag}</p>}
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" aria-labelledby="how-title" className="scroll-mt-0">
          <div data-how className="mx-auto flex min-h-dvh max-w-7xl flex-col justify-center px-4 py-24 sm:px-6 lg:py-0">
            <p data-reveal className="text-sm font-semibold tracking-wide text-brand-100/70 uppercase">How it works</p>
            <h2 id="how-title" data-split className="mt-3 max-w-3xl text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.05] font-semibold tracking-[-0.03em] text-white">
              From shelf to ledger in three steps.
            </h2>

            <div className="mt-14 grid items-center gap-12 lg:grid-cols-2">
              <div className="relative">
                <div aria-hidden className="absolute top-2 bottom-2 left-[19px] hidden w-px bg-white/10 lg:block">
                  <div data-how-progress className="h-full w-full origin-top bg-gradient-to-b from-brand-600 to-emerald-400" />
                </div>
                <ol className="space-y-10">
                  {STEPS.map((s) => (
                    <li key={s.n} data-step className="relative flex gap-6">
                      <span className="relative z-10 inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-[#060912] font-mono text-xs text-white">
                        {s.n}
                      </span>
                      <div>
                        <h3 className="text-xl font-semibold tracking-tight text-white">{s.title}</h3>
                        <p className="mt-2 max-w-md leading-relaxed text-slate-400">{s.body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Story visuals (desktop) */}
              <div aria-hidden className="relative hidden h-[26rem] lg:block">
                <div data-visual className="absolute inset-0 flex items-center justify-center">
                  <div className="w-80 rounded-[2rem] border border-white/10 bg-[#0b1120] p-4 shadow-2xl">
                    <div className="relative overflow-hidden rounded-2xl bg-black/60 p-6">
                      <div className="relative rounded-lg bg-white px-4 py-6 text-slate-900">
                        <Barcode className="h-20 w-full" />
                        <p className="mt-2 text-center font-mono text-xs tracking-[0.2em]">0200000000011</p>
                        <div data-beam className="absolute inset-x-2 top-0 h-0.5 rounded-full bg-red-500 shadow-[0_0_12px_2px_rgba(239,68,68,0.7)]" />
                      </div>
                    </div>
                    <div data-decoded className="mt-4 rounded-xl bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
                      Found <strong className="text-white">Ceramic mug, 350 ml</strong>
                      <span className="block text-xs text-emerald-300/70">SKU DEMO-MUG-001 · A-01-01 · 48 on hand</span>
                    </div>
                  </div>
                </div>

                <div data-visual className="absolute inset-0 flex items-center justify-center">
                  <div className="w-96 rounded-2xl border border-white/10 bg-[#0b1120] p-6 shadow-2xl">
                    <p className="text-sm font-semibold text-white">Confirm stock out</p>
                    <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                      <dt className="text-slate-500">Product</dt>
                      <dd className="text-slate-200">Ceramic mug, 350 ml</dd>
                      <dt className="text-slate-500">Current</dt>
                      <dd className="tabular-nums text-slate-200">48 each</dd>
                      <dt className="text-slate-500">Change</dt>
                      <dd className="font-semibold tabular-nums text-rose-300">▼ −5 each</dd>
                      <dt className="text-slate-500">New quantity</dt>
                      <dd className="font-semibold tabular-nums text-white">43 each</dd>
                      <dt className="text-slate-500">Reason</dt>
                      <dd className="text-slate-200">Sale · Order 1001</dd>
                    </dl>
                    <div data-confirm-btn className="mt-6 inline-flex rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white">
                      Confirm stock out
                    </div>
                  </div>
                </div>

                <div data-visual className="absolute inset-0 flex items-center justify-center">
                  <div className="w-[26rem] rounded-2xl border border-white/10 bg-[#0b1120] p-6 shadow-2xl">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-sm text-slate-500">Ceramic mug, 350 ml</p>
                        <p className="mt-1 text-5xl font-semibold tabular-nums text-white">
                          <span data-how-stock>48</span> <span className="text-lg text-slate-500">each</span>
                        </p>
                      </div>
                      <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">Committed</span>
                    </div>
                    <ul className="mt-6 space-y-1.5 text-sm">
                      <li data-new-row className="flex justify-between rounded-md bg-rose-400/10 px-3 py-2">
                        <span className="text-slate-200">Stock out · Sale</span>
                        <span className="font-semibold tabular-nums text-rose-300">▼ −5 <span className="font-normal text-slate-500">48 → 43</span></span>
                      </li>
                      <li className="flex justify-between rounded-md px-3 py-2">
                        <span className="text-slate-400">Stock in · Received</span>
                        <span className="tabular-nums text-emerald-300">▲ +48 <span className="text-slate-600">0 → 48</span></span>
                      </li>
                    </ul>
                    <p className="mt-4 text-xs text-slate-500">Balance and movement saved in one transaction.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Facts + trust */}
        <section id="trust" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-28 sm:px-6 lg:py-36">
          <div className="grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { to: 3, label: "ways to look up a product", sub: "Camera, scanner, keyboard" },
              { to: 5, label: "barcode formats read by camera", sub: "EAN, UPC and Code 128" },
              { to: 1, label: "transaction per stock change", sub: "Balance + history together" },
              { to: 0, from: 9, label: "ways to edit history", sub: "Corrections are new movements" },
            ].map((f) => (
              <div key={f.label} data-reveal className="bg-[#060912] p-8">
                <p className="text-6xl font-semibold tracking-tight text-white tabular-nums">
                  <span data-count data-to={f.to} data-from={f.from ?? 0}>
                    {f.to}
                  </span>
                </p>
                <p className="mt-3 font-medium text-slate-200">{f.label}</p>
                <p className="mt-1 text-sm text-slate-500">{f.sub}</p>
              </div>
            ))}
          </div>

          <div className="mt-24 grid gap-12 lg:grid-cols-2">
            <div>
              <p data-reveal className="text-sm font-semibold tracking-wide text-brand-100/70 uppercase">Security</p>
              <h2 data-split className="mt-3 text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.05] font-semibold tracking-[-0.03em] text-white">
                Your data stays in your workspace.
              </h2>
              <p data-reveal className="mt-5 max-w-lg leading-relaxed text-slate-400">
                Access rules live in the database itself, not just the interface. Even a crafted request can only reach rows that belong to
                your workspace.
              </p>
            </div>
            <ul className="grid gap-3">
              {[
                ["Row-level security on every table", "PostgreSQL policies check workspace membership for each read and write."],
                ["Trusted fields set by the server", "Your user ID, workspace and stock quantities are never taken from the browser."],
                ["No secret keys in the browser", "The app runs on your signed-in session. No admin keys are shipped to clients."],
                ["Camera stays on your device", "Frames are decoded locally and never recorded or uploaded."],
              ].map(([t, b]) => (
                <li key={t} data-reveal className="flex gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-5">
                  <span aria-hidden className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-xs text-emerald-300">
                    ✓
                  </span>
                  <div>
                    <p className="font-medium text-white">{t}</p>
                    <p className="mt-1 text-sm text-slate-400">{b}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative isolate overflow-hidden px-4 py-32 text-center sm:px-6">
          <div aria-hidden className="absolute inset-0 -z-10 flex items-center justify-center">
            <div data-glow className="size-[40rem] rounded-full bg-brand-600/25 opacity-60 blur-[140px]" />
          </div>
          <h2 data-split className="mx-auto max-w-3xl text-[clamp(2.2rem,5.5vw,4.25rem)] leading-[1.02] font-semibold tracking-[-0.04em] text-white">
            Know what you have. Know what changed.
          </h2>
          <p data-reveal className="mx-auto mt-6 max-w-xl text-lg text-slate-400">
            Create an account, load the demo data, and scan your first barcode in a couple of minutes.
          </p>
          <div data-reveal className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              data-magnetic
              href="/signup"
              className="inline-flex h-12 items-center rounded-full bg-white px-8 text-sm font-semibold text-slate-950 transition-colors hover:bg-brand-100"
            >
              Get started free
            </Link>
            <Link
              data-magnetic
              href="/login"
              className="inline-flex h-12 items-center rounded-full border border-white/15 px-8 text-sm font-semibold text-white transition-colors hover:bg-white/5"
            >
              Sign in
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-slate-500 sm:flex-row">
          <p className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" width={20} height={20} />
            SmartStock · built with Next.js and Supabase
          </p>
          <div className="flex gap-6">
            <a href="#features" className="hover:text-slate-300">Features</a>
            <a href="#how" className="hover:text-slate-300">How it works</a>
            <Link href="/login" className="hover:text-slate-300">Sign in</Link>
          </div>
        </div>
      </footer>
    </LandingMotion>
  );
}
