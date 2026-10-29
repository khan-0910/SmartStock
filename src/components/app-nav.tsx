"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cx } from "./ui";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "M3 12l9-8 9 8M5 10v10h14V10" },
  { href: "/products", label: "Products", icon: "M4 7l8-4 8 4v10l-8 4-8-4zM4 7l8 4 8-4M12 11v10" },
  { href: "/scan", label: "Scan", icon: "M4 7V4h3M17 4h3v3M20 17v3h-3M7 20H4v-3M7 8v8M10 8v8M13 8v8M16 8v8" },
  { href: "/movements", label: "Movements", icon: "M7 4v16M7 4l-3 3M7 4l3 3M17 20V4M17 20l-3-3M17 20l3-3" },
  { href: "/locations", label: "Locations", icon: "M12 21s7-6.2 7-12a7 7 0 10-14 0c0 5.8 7 12 7 12zM12 11.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" },
  { href: "/settings", label: "Settings", icon: "M12 15a3 3 0 100-6 3 3 0 000 6zM4 12h2M18 12h2M12 4v2M12 18v2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4" },
];

function isActive(path: string, href: string) {
  return path === href || path.startsWith(`${href}/`);
}

function NavLinks({ path, onNavigate }: { path: string; onNavigate?: () => void }) {
  return (
    <ul className="space-y-1">
      {NAV.map((item) => {
        const active = isActive(path, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cx(
                "flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                active ? "bg-lime text-ink" : "text-paper/70 hover:bg-white/10 hover:text-paper",
              )}
            >
              <svg aria-hidden viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d={item.icon} />
              </svg>
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function AppNav({ workspaceName, email, signOutAction }: { workspaceName: string; email: string; signOutAction: () => Promise<void> }) {
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

  const footer = (
    <div className="border-t border-white/10 pt-4">
      <p className="truncate px-3 text-xs text-paper/50" title={email}>
        {email}
      </p>
      <form action={signOutAction}>
        <button type="submit" className="mt-2 flex min-h-10 w-full items-center rounded-lg px-3 text-sm font-medium text-paper/80 hover:bg-white/10 hover:text-paper">
          Sign out
        </button>
      </form>
    </div>
  );

  const brand = (
    <Link href="/dashboard" className="flex items-center gap-2 px-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.svg" alt="" width={28} height={28} />
      <span className="min-w-0">
        <span className="block font-display text-base font-bold leading-tight tracking-tight text-paper">SmartStock</span>
        <span className="block truncate text-xs text-paper/50">{workspaceName}</span>
      </span>
    </Link>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col bg-ink p-3 lg:flex">
        <div className="py-3">{brand}</div>
        <nav aria-label="Main" className="mt-4 flex-1">
          <NavLinks path={path} />
        </nav>
        {footer}
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-ink px-2 py-2 lg:hidden">
        {brand}
        <button
          ref={toggleRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          className="inline-flex size-11 items-center justify-center rounded-lg text-paper hover:bg-white/10"
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </header>
      {open && (
        <div ref={panelRef} id="mobile-nav" className="fixed inset-x-0 top-[61px] bottom-0 z-20 overflow-y-auto bg-ink p-3 lg:hidden">
          <nav aria-label="Main">
            <NavLinks path={path} onNavigate={() => setOpen(false)} />
          </nav>
          <div className="mt-4">{footer}</div>
        </div>
      )}
    </>
  );
}
