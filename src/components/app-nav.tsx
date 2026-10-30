"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cx } from "./ui";

type Item = { href: string; label: string; icon: string };

const SECTIONS: { title: string; items: Item[] }[] = [
  {
    title: "Inventory",
    items: [
      { href: "/dashboard", label: "Overview", icon: "M4 13h6V4H4zM14 20h6v-9h-6zM14 4v3h6V4zM4 20h6v-3H4z" },
      { href: "/products", label: "Products", icon: "M4 7.5L12 3l8 4.5v9L12 21l-8-4.5zM4 7.5l8 4.5 8-4.5M12 12v9" },
      { href: "/movements", label: "Movements", icon: "M7 4v16M3.5 7.5L7 4l3.5 3.5M17 20V4M13.5 16.5L17 20l3.5-3.5" },
      { href: "/locations", label: "Locations", icon: "M12 21s7-6.2 7-12a7 7 0 10-14 0c0 5.8 7 12 7 12zM12 11.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" },
    ],
  },
  {
    title: "Workspace",
    items: [
      {
        href: "/settings",
        label: "Settings",
        icon: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z",
      },
    ],
  },
];

function Icon({ d, className }: { d: string; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={cx("size-[18px] shrink-0", className)} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

function NavBody({
  path,
  workspaceName,
  role,
  onNavigate,
}: {
  path: string;
  workspaceName: string;
  role: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="flex items-center gap-3 rounded-xl border border-ink/[0.07] bg-white p-2.5 shadow-[0_1px_2px_rgba(45,42,62,0.05)]">
        <span aria-hidden className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-lime font-display text-sm font-bold text-ink">
          {workspaceName.trim().charAt(0).toUpperCase() || "W"}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-ink">{workspaceName}</span>
          <span className="block text-xs text-ink/50 capitalize">{role}</span>
        </span>
      </div>

      <Link
        href="/scan"
        onClick={onNavigate}
        aria-current={path === "/scan" ? "page" : undefined}
        className="mt-4 flex h-10 items-center justify-center gap-2 rounded-lg bg-ink text-sm font-semibold text-paper transition-colors hover:bg-ink-soft"
      >
        <Icon d="M4 7V4h3M17 4h3v3M20 17v3h-3M7 20H4v-3M8 8v8M11 8v8M14 8v8M17 8v8" />
        Scan barcode
      </Link>

      <nav aria-label="Main" className="mt-6 flex-1 space-y-6">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="px-3 text-[11px] font-semibold tracking-[0.08em] text-ink/40 uppercase">{section.title}</p>
            <ul className="mt-2 space-y-0.5">
              {section.items.map((item) => {
                const active = path === item.href || path.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cx(
                        "relative flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                        active ? "bg-white text-ink shadow-[0_1px_2px_rgba(45,42,62,0.06)]" : "text-ink/60 hover:bg-white/60 hover:text-ink",
                      )}
                    >
                      {active && <span aria-hidden className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-teal" />}
                      <Icon d={item.icon} className={active ? "text-(--sage-ink)" : undefined} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </>
  );
}

export function AppNav({
  workspaceName,
  email,
  role,
  signOutAction,
}: {
  workspaceName: string;
  email: string;
  role: string;
  signOutAction: () => Promise<void>;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Escape closes the mobile menu and returns focus to the toggle.
  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>("a")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const brand = (
    <Link href="/" title="SmartStock homepage" className="flex items-center gap-2.5 rounded-md">
      <span aria-hidden className="inline-flex size-7 items-center justify-center rounded-lg bg-ink text-paper">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
          <path d="M4 7.5L12 3l8 4.5v9L12 21l-8-4.5zM4 7.5l8 4.5 8-4.5M12 12v9" />
        </svg>
      </span>
      <span className="font-display text-[17px] font-bold tracking-tight text-ink">SmartStock</span>
    </Link>
  );

  const account = (
    <div className="flex items-center gap-3 border-t border-ink/[0.07] pt-4">
      <span aria-hidden className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-coral text-xs font-bold text-ink">
        {email.charAt(0).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1 truncate text-xs text-ink/60" title={email}>
        {email}
      </span>
      <form action={signOutAction}>
        <button
          type="submit"
          title="Sign out"
          className="inline-flex size-8 items-center justify-center rounded-lg text-ink/50 transition-colors hover:bg-white hover:text-ink"
        >
          <span className="sr-only">Sign out</span>
          <Icon d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3M10 17l5-5-5-5M15 12H4" />
        </button>
      </form>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar. z-40 keeps it above the (positioned) page content. */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-ink/[0.06] bg-paper-deep/70 px-4 py-5 lg:flex">
        <div className="px-1 pb-5">{brand}</div>
        <NavBody path={path} workspaceName={workspaceName} role={role} />
        {account}
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-ink/[0.06] bg-paper-deep px-4 lg:hidden">
        {brand}
        <button
          ref={toggleRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          className="-mr-2 inline-flex size-10 items-center justify-center rounded-lg text-ink hover:bg-white"
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </header>
      {open && (
        <div ref={panelRef} id="mobile-nav" data-lenis-prevent className="fixed inset-x-0 top-14 bottom-0 z-40 flex flex-col overflow-y-auto bg-paper-deep p-4 lg:hidden">
          <NavBody path={path} workspaceName={workspaceName} role={role} onNavigate={() => setOpen(false)} />
          <div className="mt-6">{account}</div>
        </div>
      )}
    </>
  );
}
