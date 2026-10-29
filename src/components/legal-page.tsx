import Link from "next/link";
import type { ReactNode } from "react";
import { SiteFooter } from "./site-footer";
import { SmoothScroll } from "./smooth-scroll";
import { site } from "@/lib/site";

/** Shared shell for Privacy, Terms, Cookies and Security pages. */
export function LegalPage({
  title,
  intro,
  sections,
}: {
  title: string;
  intro: ReactNode;
  sections: { id: string; title: string; body: ReactNode }[];
}) {
  return (
    <div className="min-h-dvh bg-paper">
      <SmoothScroll />
      <header className="border-b border-ink/10">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" width={28} height={28} />
            <span className="font-display text-lg font-bold tracking-tight">SmartStock</span>
          </Link>
          <Link href="/login" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper hover:bg-brand-600">
            Sign in
          </Link>
        </div>
      </header>

      <main className="page-enter stagger mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
        <p className="text-sm font-semibold tracking-wide text-brand-600 uppercase">Legal</p>
        <h1 className="mt-2 font-display text-5xl font-extrabold tracking-[-0.04em] sm:text-7xl">
          {title}
          <span aria-hidden className="text-coral">.</span>
        </h1>
        <p className="mt-3 text-sm text-ink/60">Last updated {site.legalUpdated}</p>
        <div className="mt-6 max-w-3xl text-lg leading-relaxed text-ink/80">{intro}</div>

        <div className="mt-14 grid gap-12 lg:grid-cols-[14rem_1fr]">
          <nav aria-label="On this page" className="lg:sticky lg:top-8 lg:self-start">
            <p className="mb-3 text-xs font-semibold tracking-wide text-ink/50 uppercase">On this page</p>
            <ol className="space-y-2 text-sm">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="text-ink/70 hover:text-brand-600">
                    {i + 1}. {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="stagger-children max-w-3xl space-y-12">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-8">
                <h2 className="font-display text-2xl font-bold tracking-tight">
                  <span className="mr-2 text-brand-600">{String(i + 1).padStart(2, "0")}</span>
                  {s.title}
                </h2>
                <div className="legal-body mt-4 space-y-4 leading-relaxed text-ink/80 [&_a]:font-semibold [&_a]:text-brand-700 [&_a]:underline [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-ink">
                  {s.body}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
