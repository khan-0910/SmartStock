import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LandingMotion } from "@/components/landing/landing-motion";
import CircularText from "@/components/react-bits/CircularText";
import RotatingText from "@/components/react-bits/RotatingText";
import ScrollVelocity from "@/components/react-bits/ScrollVelocity";
import { SiteFooter } from "@/components/site-footer";
import { photos } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: { absolute: "SmartStock: inventory that never disagrees with itself" },
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

const DECK = [
  { photo: photos.warehouse, frame: "bg-lime", tag: "Aisle B · 2,140 units" },
  { photo: photos.boxes, frame: "bg-coral", tag: "Receiving · +120" },
  { photo: photos.shelf, frame: "bg-lilac", tag: "Shelf A-01-03" },
  { photo: photos.store, frame: "bg-sun", tag: "Low stock · 3 left" },
];

const STICKERS = [
  { text: "▲ +120 Received", cls: "bg-lime -left-6 top-10 -rotate-6", depth: 1.4 },
  { text: "▼ −5 Sale", cls: "bg-coral -right-4 top-1/3 rotate-6", depth: 2.2 },
  { text: "Low stock · 3", cls: "bg-sun left-4 bottom-16 rotate-3", depth: 1.8 },
  { text: "A-01-03", cls: "bg-lilac right-10 -bottom-2 -rotate-3 font-mono", depth: 1 },
];

const FEATURES = [
  {
    title: "Scan three ways",
    body: "Phone camera, USB or Bluetooth scanner, or typed by hand. Every path lands in the same lookup, and a scan never changes stock by itself.",
    tag: "EAN-13 · EAN-8 · UPC-A · UPC-E · Code 128",
    photo: photos.parcel,
    color: "bg-lime",
  },
  {
    title: "An atomic ledger",
    body: "Each change locks the product, checks the live quantity, then updates the balance and writes history in one transaction. Both happen, or neither does.",
    tag: "One transaction per change",
    photo: photos.forklift,
    color: "bg-coral",
  },
  {
    title: "Never below zero",
    body: "Stock-out is checked against the real balance at commit time, so two people grabbing the last unit at once can't both succeed.",
    tag: "Row-locked, race-safe",
    photo: photos.boxes,
    color: "bg-lilac",
  },
  {
    title: "Low stock at a glance",
    body: "Set a reorder level per product. Anything at or below it is flagged on the dashboard, one click from the filtered list.",
    tag: "Reorder levels per product",
    photo: photos.store2,
    color: "bg-sun",
  },
  {
    title: "Locations that make sense",
    body: "Name bins like A-01-03. Every product has a home, and deactivated locations keep their history intact.",
    tag: "Bins, shelves, docks",
    photo: photos.warehouse,
    color: "bg-teal",
  },
];

const STEPS = [
  { n: "01", title: "Scan or search", body: "Point a phone at the barcode, pull the trigger on a USB scanner, or type the code. SmartStock finds the exact product in your workspace." },
  { n: "02", title: "Review the change", body: "Pick stock in, stock out or a counted adjustment. You see the current quantity, the change and the result before anything is saved." },
  { n: "03", title: "It's on the record", body: "The database commits the new balance and the movement together. History updates instantly and the dashboard shows it on the next load." },
];

const GALLERY = [
  { photo: photos.forklift, caption: "Warehouses", cls: "md:col-span-2 md:row-span-2" },
  { photo: photos.store, caption: "Shops", cls: "" },
  { photo: photos.parcel, caption: "Online sellers", cls: "" },
  { photo: photos.shelf, caption: "Stockrooms", cls: "" },
  { photo: photos.boxes, caption: "Receiving docks", cls: "" },
];

export default async function LandingPage({ searchParams }: { searchParams: Promise<{ account?: string }> }) {
  const { account } = await searchParams;
  // Signed-in visitors still see the homepage, with buttons pointing into the app.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const primary = user ? { href: "/dashboard", label: "Open dashboard" } : { href: "/signup", label: "Start free" };
  return (
    <LandingMotion className="landing min-h-dvh overflow-x-clip bg-paper text-ink">
      {account === "deleted" && (
        <p role="status" className="fixed inset-x-0 top-20 z-[60] mx-auto w-fit rounded-full bg-ink px-5 py-2 text-sm font-semibold text-paper shadow-lg">
          Your account and data have been deleted.
        </p>
      )}

      {/* Header */}
      <header data-header className="fixed inset-x-0 top-3 z-50 px-3">
        <nav
          aria-label="Main"
          className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 rounded-full border border-ink/10 bg-paper/90 px-3 pl-5 shadow-[0_8px_30px_-12px_rgba(19,17,28,0.25)] transition-colors data-scrolled:bg-paper"
        >
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" width={26} height={26} />
            <span className="font-display text-lg font-bold tracking-tight">SmartStock</span>
          </Link>
          <ul className="hidden items-center gap-7 text-sm font-medium text-ink/70 md:flex">
            {[
              ["#features", "Features"],
              ["#how", "How it works"],
              ["#trust", "Security"],
            ].map(([href, label]) => (
              <li key={href}>
                <a href={href} className="hover:text-ink">
                  <span className="roll">
                    <span>
                      <span>{label}</span>
                      <span aria-hidden>{label}</span>
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-1">
            {!user && (
              <Link href="/login" className="hidden rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap text-ink/80 hover:text-ink sm:inline-flex">
                Sign in
              </Link>
            )}
            <Link
              href={user ? "/dashboard" : "/signup"}
              className="rounded-full bg-ink px-4 py-2 text-sm font-semibold whitespace-nowrap text-paper transition-colors hover:bg-brand-600"
            >
              {user ? "Open dashboard" : "Get started"}
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section data-hero className="relative isolate overflow-hidden pt-32 pb-20 lg:min-h-dvh lg:pt-36">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60rem_40rem_at_85%_10%,rgba(201,184,255,0.55),transparent_60%),radial-gradient(40rem_30rem_at_0%_90%,rgba(215,247,91,0.45),transparent_60%)]" />
          <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.05fr_1fr]">
            <div data-hero-copy>
              <p data-hero-fade className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white px-3 py-1 text-xs font-semibold">
                <span className="relative flex size-2">
                  <span data-live-dot className="absolute inset-0 rounded-full bg-teal" />
                  <span className="relative size-2 rounded-full bg-teal" />
                </span>
                Inventory for small warehouses &amp; shops
              </p>
              <h1 className="mt-6 font-display text-[clamp(3rem,7.4vw,6.4rem)] leading-[0.92] font-extrabold tracking-[-0.045em]">
                <span data-hero-title className="block">
                  Inventory that
                </span>
                <span data-hero-fade className="mt-2 block">
                  <RotatingText
                    texts={["counts itself.", "never lies.", "scans fast.", "stays honest."]}
                    effect="flip"
                    rotationInterval={2600}
                    mainClassName="inline-flex overflow-hidden rounded-[0.3em] bg-ink px-[0.22em] pb-[0.06em] font-serif font-normal italic tracking-normal text-lime"
                  />
                </span>
              </h1>
              <p data-hero-fade className="mt-7 max-w-xl text-lg leading-relaxed text-ink/70">
                Track every product, every shelf and every stock movement. Scan a barcode, confirm the change, and the balance and its audit
                trail are saved together. Always.
              </p>
              <div data-hero-fade className="mt-9 flex flex-wrap items-center gap-3">
                <Link
                  data-magnetic
                  href={primary.href}
                  className="group inline-flex h-13 items-center gap-2 rounded-full bg-coral px-7 text-base font-bold text-ink shadow-[0_10px_0_0_var(--color-ink)] transition-[box-shadow,translate] hover:translate-y-0.5 hover:shadow-[0_6px_0_0_var(--color-ink)]"
                >
                  {primary.label}
                  <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                </Link>
                <a data-magnetic href="#how" className="inline-flex h-13 items-center rounded-full border-2 border-ink px-7 text-base font-bold hover:bg-ink hover:text-paper">
                  See how it works
                </a>
              </div>
              <ul data-hero-fade className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-ink/60">
                <li>✓ No credit card</li>
                <li>✓ Works on phone &amp; desktop</li>
                <li>✓ Your data, exportable anytime</li>
              </ul>
            </div>

            {/* Rotating photo deck */}
            <div data-deck-wrap className="relative mx-auto h-[26rem] w-full max-w-md sm:h-[32rem] lg:max-w-none">
              <div data-deck className="relative size-full [perspective:1400px]">
                {DECK.map((d, i) => (
                  <figure
                    key={d.tag}
                    data-deck-card
                    className={`absolute inset-x-[8%] inset-y-[4%] rounded-[2rem] p-2.5 shadow-[0_30px_60px_-25px_rgba(19,17,28,0.55)] will-change-transform ${d.frame}`}
                    style={{ zIndex: DECK.length - i }}
                  >
                    <div className="relative size-full overflow-hidden rounded-[1.5rem] bg-ink">
                      <Image src={`${d.photo.src}?w=1200&q=80`} alt={d.photo.alt} fill priority={i < 2} sizes="(min-width: 1024px) 40vw, 90vw" className="object-cover" />
                    </div>
                    <figcaption className="absolute bottom-6 left-6 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-paper">{d.tag}</figcaption>
                  </figure>
                ))}
              </div>
              {STICKERS.map((s) => (
                <span
                  key={s.text}
                  aria-hidden
                  data-sticker
                  data-depth={s.depth}
                  className={`absolute z-20 rounded-full border-2 border-ink px-4 py-2 text-sm font-bold text-ink shadow-[4px_4px_0_0_var(--color-ink)] ${s.cls}`}
                >
                  {s.text}
                </span>
              ))}
              <div className="absolute -top-8 -right-2 z-30 hidden sm:block">
                <CircularText
                  text="SCAN ✦ COUNT ✦ CONFIRM ✦ RECORD ✦ "
                  size={132}
                  fontSize={12}
                  fontWeight={800}
                  spinDuration={14}
                  onHover="speedUp"
                  color="#fbf6ec"
                  className="rounded-full bg-ink"
                >
                  <Barcode className="h-9 w-12 text-lime" />
                </CircularText>
              </div>
            </div>
          </div>
        </section>

        {/* Velocity marquee */}
        <section aria-label="Capabilities" className="relative z-10 -my-4 -rotate-2 bg-ink py-6 text-lime">
          <ScrollVelocity
            texts={["Scan it ✦ Count it ✦ Trust it ✦", "Stock in ✦ Stock out ✦ Adjust ✦"]}
            velocity={60}
            numCopies={5}
            outlineAlternate
            fontSize="clamp(2rem, 5vw, 4.5rem)"
            fontWeight={800}
            gap={32}
            className="font-display tracking-tight"
          />
        </section>

        {/* Scroll-expand photo */}
        <section data-expand aria-label="Built for real stockrooms" className="relative h-dvh overflow-hidden">
          <div data-expand-frame className="absolute inset-0 overflow-hidden bg-ink [clip-path:inset(12%_8%_round_2rem)]">
            <Image data-expand-img src={`${photos.forklift.src}?w=2000&q=80`} alt={photos.forklift.alt} fill sizes="100vw" className="object-cover" />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/30 to-ink/10" />
            <div className="absolute inset-x-0 bottom-0 mx-auto max-w-7xl px-4 pb-16 sm:px-6">
              <p data-expand-kicker className="text-sm font-bold tracking-wide text-lime uppercase">
                Made for the floor, not the boardroom
              </p>
              <h2 data-expand-title className="mt-3 max-w-4xl font-display text-[clamp(2.5rem,6.5vw,6rem)] leading-[0.95] font-extrabold tracking-[-0.04em] text-paper">
                Built for real stockrooms.
              </h2>
            </div>
          </div>
        </section>

        {/* Features: horizontal scroll on desktop */}
        <section id="features" data-hscroll className="relative scroll-mt-0 overflow-hidden py-24 lg:flex lg:h-dvh lg:flex-col lg:justify-center lg:py-0">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
            <p data-reveal className="text-sm font-bold tracking-wide text-brand-600 uppercase">Features</p>
            <h2 data-split className="mt-3 max-w-3xl font-display text-[clamp(2.2rem,5vw,4rem)] leading-[1] font-extrabold tracking-[-0.035em]">
              Everything a small stockroom needs. <span className="font-serif font-normal italic text-brand-600">Nothing it doesn&apos;t.</span>
            </h2>
          </div>
          <div data-htrack className="mt-12 grid gap-5 px-4 sm:px-6 md:grid-cols-2 lg:flex lg:w-max lg:gap-6 lg:pr-[10vw] lg:pl-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))]">
            {FEATURES.map((f, i) => (
              <article
                key={f.title}
                data-hcard
                className={`group relative flex flex-col overflow-hidden rounded-[2rem] border-2 border-ink p-3 shadow-[6px_6px_0_0_var(--color-ink)] transition-[box-shadow,translate] duration-300 hover:-translate-y-1 hover:shadow-[10px_10px_0_0_var(--color-ink)] lg:h-[min(28rem,58vh)] lg:w-[26rem] ${f.color}`}
                style={{ ["--tilt" as string]: `${i % 2 ? 3 : -3}deg` }}
              >
                <div className="relative h-52 shrink-0 overflow-hidden rounded-[1.5rem] bg-ink lg:h-[48%]">
                  <Image
                    data-hcard-img
                    src={`${f.photo.src}?w=900&q=75`}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 26rem, (min-width: 768px) 50vw, 100vw"
                    className="scale-110 object-cover transition-transform duration-700 ease-out group-hover:scale-125 group-hover:rotate-2"
                  />
                  <span className="absolute top-3 left-3 rounded-full bg-paper px-3 py-1 font-mono text-xs font-bold">{String(i + 1).padStart(2, "0")}</span>
                </div>
                <div className="flex flex-1 flex-col px-3 pt-5 pb-3">
                  <h3 className="font-display text-2xl font-extrabold tracking-tight">{f.title}</h3>
                  <p className="mt-2 leading-relaxed text-ink/80">{f.body}</p>
                  <p className="mt-auto pt-4 font-mono text-xs font-semibold text-ink/70">{f.tag}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* How it works (dark) */}
        <section id="how" aria-labelledby="how-title" className="bg-ink text-paper">
          <div data-how className="mx-auto flex min-h-dvh max-w-7xl flex-col justify-center px-4 py-24 sm:px-6 lg:py-0">
            <p data-reveal className="text-sm font-bold tracking-wide text-lime uppercase">How it works</p>
            <h2 id="how-title" data-split className="mt-3 max-w-3xl font-display text-[clamp(2.2rem,5vw,4rem)] leading-[1] font-extrabold tracking-[-0.035em]">
              From shelf to ledger in <span className="font-serif font-normal italic text-coral">three steps.</span>
            </h2>

            <div className="mt-14 grid items-center gap-12 lg:grid-cols-2">
              <div className="relative">
                <div aria-hidden className="absolute top-2 bottom-2 left-[21px] hidden w-0.5 bg-white/10 lg:block">
                  <div data-how-progress className="h-full w-full origin-top bg-gradient-to-b from-lime via-sun to-coral" />
                </div>
                <ol className="space-y-10">
                  {STEPS.map((s) => (
                    <li key={s.n} data-step className="relative flex gap-6">
                      <span className="relative z-10 inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-lime font-mono text-sm font-bold text-ink">
                        {s.n}
                      </span>
                      <div>
                        <h3 className="font-display text-2xl font-bold tracking-tight">{s.title}</h3>
                        <p className="mt-2 max-w-md leading-relaxed text-paper/70">{s.body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div aria-hidden className="relative hidden h-[28rem] lg:block">
                <div data-visual className="absolute inset-0 flex items-center justify-center">
                  <div className="w-80 rotate-[-3deg] rounded-[2.2rem] border-2 border-paper/20 bg-ink-soft p-4">
                    <div className="relative overflow-hidden rounded-2xl bg-black p-6">
                      <div className="relative rounded-lg bg-paper px-4 py-6 text-ink">
                        <Barcode className="h-20 w-full" />
                        <p className="mt-2 text-center font-mono text-xs tracking-[0.2em]">0200000000011</p>
                        <div data-beam className="absolute inset-x-2 top-0 h-0.5 rounded-full bg-coral shadow-[0_0_14px_3px_rgba(255,90,60,0.8)]" />
                      </div>
                    </div>
                    <div data-decoded className="mt-4 rounded-xl bg-lime px-4 py-3 text-sm text-ink">
                      Found <strong>Ceramic mug, 350 ml</strong>
                      <span className="block text-xs opacity-70">SKU DEMO-MUG-001 · A-01-01 · 48 on hand</span>
                    </div>
                  </div>
                </div>

                <div data-visual className="absolute inset-0 flex items-center justify-center">
                  <div className="w-96 rotate-2 rounded-3xl border-2 border-ink bg-paper p-6 text-ink shadow-[8px_8px_0_0_var(--color-lime)]">
                    <p className="font-display text-lg font-bold">Confirm stock out</p>
                    <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                      <dt className="text-ink/60">Product</dt>
                      <dd>Ceramic mug, 350 ml</dd>
                      <dt className="text-ink/60">Current</dt>
                      <dd className="tabular-nums">48 each</dd>
                      <dt className="text-ink/60">Change</dt>
                      <dd className="font-bold tabular-nums text-coral">▼ −5 each</dd>
                      <dt className="text-ink/60">New quantity</dt>
                      <dd className="font-bold tabular-nums">43 each</dd>
                      <dt className="text-ink/60">Reason</dt>
                      <dd>Sale · Order 1001</dd>
                    </dl>
                    <div data-confirm-btn className="mt-6 inline-flex rounded-full bg-coral px-5 py-2 text-sm font-bold text-ink">
                      Confirm stock out
                    </div>
                  </div>
                </div>

                <div data-visual className="absolute inset-0 flex items-center justify-center">
                  <div className="w-[26rem] -rotate-1 rounded-3xl border-2 border-ink bg-lilac p-6 text-ink shadow-[8px_8px_0_0_var(--color-coral)]">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-sm opacity-70">Ceramic mug, 350 ml</p>
                        <p className="mt-1 font-display text-6xl font-extrabold tabular-nums">
                          <span data-how-stock>48</span> <span className="text-lg font-semibold opacity-60">each</span>
                        </p>
                      </div>
                      <span className="rounded-full bg-ink px-3 py-1 text-xs font-bold text-lime">Committed ✓</span>
                    </div>
                    <ul className="mt-6 space-y-1.5 text-sm">
                      <li data-new-row className="flex justify-between rounded-lg bg-paper px-3 py-2">
                        <span>Stock out · Sale</span>
                        <span className="font-bold tabular-nums text-coral">▼ −5 <span className="font-normal text-ink/50">48 → 43</span></span>
                      </li>
                      <li className="flex justify-between rounded-lg px-3 py-2">
                        <span className="opacity-70">Stock in · Received</span>
                        <span className="tabular-nums">▲ +48 <span className="opacity-50">0 → 48</span></span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Gallery */}
        <section className="mx-auto max-w-7xl px-4 py-28 sm:px-6 lg:py-36">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <h2 data-split className="max-w-2xl font-display text-[clamp(2.2rem,5vw,4rem)] leading-[1] font-extrabold tracking-[-0.035em]">
              From the dock <span className="font-serif font-normal italic text-coral">to the shelf.</span>
            </h2>
            <p data-reveal className="max-w-sm text-ink/70">
              Whether you run a back room, a shop floor or a fulfilment corner, SmartStock keeps one honest number for every product.
            </p>
          </div>
          <div className="mt-12 grid auto-rows-[14rem] gap-4 md:grid-cols-4 md:auto-rows-[15rem]">
            {GALLERY.map((g) => (
              <figure key={g.caption} data-clip className={`group relative overflow-hidden rounded-[1.75rem] bg-ink ${g.cls}`}>
                <Image
                  data-clip-img
                  src={`${g.photo.src}?w=1400&q=78`}
                  alt={g.photo.alt}
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-110 group-hover:-rotate-1"
                />
                <figcaption className="absolute bottom-4 left-4 translate-y-1 rounded-full bg-paper px-4 py-1.5 text-sm font-bold transition-transform duration-500 group-hover:-translate-y-1 group-hover:bg-lime">
                  {g.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* Facts + trust */}
        <section id="trust" className="mx-auto max-w-7xl scroll-mt-24 px-4 pb-28 sm:px-6 lg:pb-36">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { to: 3, label: "ways to look up a product", sub: "Camera, scanner, keyboard", color: "bg-lime", rot: "-rotate-1" },
              { to: 5, label: "barcode formats from the camera", sub: "EAN, UPC and Code 128", color: "bg-lilac", rot: "rotate-1" },
              { to: 1, label: "transaction per stock change", sub: "Balance + history together", color: "bg-sun", rot: "-rotate-1" },
              { to: 0, from: 9, label: "ways to edit history", sub: "Corrections are new movements", color: "bg-coral", rot: "rotate-1" },
            ].map((f) => (
              <div
                key={f.label}
                data-reveal
                className={`rounded-[1.75rem] border-2 border-ink p-7 shadow-[6px_6px_0_0_var(--color-ink)] transition-transform duration-300 hover:rotate-0 hover:-translate-y-1 ${f.color} ${f.rot}`}
              >
                <p className="font-display text-7xl font-extrabold tracking-tight tabular-nums">
                  <span data-count data-to={f.to} data-from={f.from ?? 0}>
                    {f.to}
                  </span>
                </p>
                <p className="mt-3 font-bold">{f.label}</p>
                <p className="mt-1 text-sm text-ink/70">{f.sub}</p>
              </div>
            ))}
          </div>

          <div className="mt-28 grid gap-12 lg:grid-cols-2">
            <div>
              <p data-reveal className="text-sm font-bold tracking-wide text-brand-600 uppercase">Security</p>
              <h2 data-split className="mt-3 font-display text-[clamp(2.2rem,5vw,3.75rem)] leading-[1] font-extrabold tracking-[-0.035em]">
                Your data stays <span className="font-serif font-normal italic text-brand-600">in your workspace.</span>
              </h2>
              <p data-reveal className="mt-5 max-w-lg leading-relaxed text-ink/70">
                Access rules live in the database itself, not just the interface. Even a hand-crafted request can only reach rows that belong to
                your workspace. <Link href="/security" className="font-semibold text-brand-700 underline">How we protect you →</Link>
              </p>
            </div>
            <ul className="grid gap-3">
              {[
                ["Row-level security on every table", "PostgreSQL policies check workspace membership for each read and write."],
                ["Strict Content Security Policy", "Per-request nonces block injected scripts. Clickjacking and sniffing are off."],
                ["Trusted fields set by the server", "Your user ID, workspace and stock quantities are never taken from the browser."],
                ["Camera stays on your device", "Frames are decoded locally and never recorded or uploaded."],
              ].map(([t, b]) => (
                <li key={t} data-reveal className="flex gap-4 rounded-2xl border-2 border-ink/10 bg-white p-5 transition-colors hover:border-ink">
                  <span aria-hidden className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-teal text-sm font-bold text-ink">
                    ✓
                  </span>
                  <div>
                    <p className="font-bold">{t}</p>
                    <p className="mt-1 text-sm text-ink/70">{b}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative isolate overflow-hidden bg-coral px-4 py-32 text-center sm:px-6">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div data-orbit className="absolute top-10 left-[6%] size-40 overflow-hidden rounded-[2rem] border-2 border-ink sm:size-52">
              <Image src={`${photos.boxes.src}?w=500&q=70`} alt="" fill sizes="13rem" className="object-cover" />
            </div>
            <div data-orbit className="absolute right-[5%] bottom-10 size-36 overflow-hidden rounded-full border-2 border-ink sm:size-48">
              <Image src={`${photos.shelf.src}?w=500&q=70`} alt="" fill sizes="12rem" className="object-cover" />
            </div>
          </div>
          <h2 data-split className="mx-auto max-w-4xl font-display text-[clamp(2.6rem,7vw,6rem)] leading-[0.95] font-extrabold tracking-[-0.045em]">
            Know what you have. <span className="font-serif font-normal italic">Know what changed.</span>
          </h2>
          <p data-reveal className="mx-auto mt-6 max-w-xl text-lg font-medium text-ink/80">
            Create an account, load the demo data, and scan your first barcode in a couple of minutes.
          </p>
          <div data-reveal className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              data-magnetic
              href={primary.href}
              className="inline-flex h-13 items-center rounded-full bg-ink px-8 text-base font-bold text-paper shadow-[0_8px_0_0_var(--color-paper)] transition-[box-shadow,translate] hover:translate-y-0.5 hover:shadow-[0_4px_0_0_var(--color-paper)]"
            >
              {user ? "Open dashboard" : "Get started free"}
            </Link>
            {!user && (
              <Link data-magnetic href="/login" className="inline-flex h-13 items-center rounded-full border-2 border-ink px-8 text-base font-bold hover:bg-ink hover:text-paper">
                Sign in
              </Link>
            )}
          </div>
        </section>
      </main>

      <SiteFooter />
    </LandingMotion>
  );
}
