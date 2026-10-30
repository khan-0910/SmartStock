import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { formatDelta, MOVEMENT_LABELS } from "@/lib/format";
import type { MovementType } from "@/lib/types";

// Small shared building blocks. Server-safe (no hooks).

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const BUTTON = {
  primary: "bg-brand-700 text-white shadow-[0_6px_16px_-8px_var(--color-brand-700)] hover:bg-brand-800 disabled:bg-brand-700/50",
  secondary: "bg-white text-ink ring-1 ring-inset ring-ink/20 hover:bg-paper-deep disabled:text-ink/60",
  danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600/60",
  ghost: "text-ink/80 hover:bg-paper",
} as const;

export type ButtonVariant = keyof typeof BUTTON;

export function buttonClass(variant: ButtonVariant = "primary", extra?: string) {
  return cx(
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-[background-color,color,transform] duration-150 active:scale-[0.98] disabled:cursor-not-allowed",
    BUTTON[variant],
    extra,
  );
}

export function Button({ variant = "primary", className, ...props }: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

export function LinkButton({ variant = "primary", className, ...props }: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}

export const inputClass =
  "block w-full min-h-10 rounded-xl border border-brand-600/20 bg-white/90 px-3.5 py-2 text-sm text-ink placeholder:text-ink/35 transition-[border-color,box-shadow] duration-200 hover:border-ink/30 focus:border-brand-600 focus:shadow-[0_0_0_4px_rgba(91,61,245,0.15)] focus:outline-none aria-[invalid=true]:border-coral";

export function Field({
  id,
  label,
  hint,
  error,
  required,
  children,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-semibold text-ink">
        {label}
        {required ? <span className="text-coral"> *</span> : <span className="font-normal text-ink/50"> (optional)</span>}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-ink/55">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

/** aria props tying an input to its hint and error. */
export function describedBy(id: string, opts: { hint?: boolean; error?: string }) {
  const ids = [opts.hint && `${id}-hint`, opts.error && `${id}-error`].filter(Boolean).join(" ");
  return { "aria-describedby": ids || undefined, "aria-invalid": opts.error ? true : undefined };
}

export function Alert({
  tone = "info",
  title,
  children,
  role,
}: {
  tone?: "info" | "success" | "error" | "warning";
  title?: string;
  children?: ReactNode;
  role?: "alert" | "status";
}) {
  const tones = {
    info: "border-brand-600/20 bg-brand-50 text-ink",
    success: "border-teal/40 bg-teal/10 text-ink",
    error: "border-coral/40 bg-coral/10 text-ink",
    warning: "border-sun/60 bg-sun/15 text-ink",
  };
  const icons = { info: "ℹ", success: "✓", error: "✕", warning: "!" };
  return (
    <div role={role} className={cx("flex gap-3 rounded-xl border p-3.5 text-sm", tones[tone])}>
      <span aria-hidden className={cx("inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold", { info: "bg-brand-600 text-white", success: "bg-teal text-ink", error: "bg-coral text-ink", warning: "bg-sun text-ink" }[tone])}>
        {icons[tone]}
      </span>
      <div className="space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children}
      </div>
    </div>
  );
}

export type HeaderTone = "lavender" | "sage" | "peach";

// The wash ends in a different pastel per section so each area has its own identity.
const HEADER_WASH: Record<HeaderTone, string> = {
  lavender: "bg-[linear-gradient(115deg,var(--color-lilac)_0%,var(--color-paper)_60%,var(--color-lilac)_140%)]",
  sage: "bg-[linear-gradient(115deg,var(--color-lilac)_0%,var(--color-paper)_55%,var(--color-lime)_130%)]",
  peach: "bg-[linear-gradient(115deg,var(--color-lilac)_0%,var(--color-paper)_55%,var(--color-coral)_130%)]",
};

/** Section overview banner: title, summary, actions and an optional row of stats. */
export function PageHeader({
  title,
  description,
  actions,
  kicker,
  stats,
  tone = "lavender",
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  kicker?: string;
  stats?: { label: string; value: ReactNode }[];
  tone?: HeaderTone;
}) {
  return (
    <section className={cx("relative mb-8 overflow-hidden rounded-3xl border border-ink/[0.06] p-6 sm:p-8", HEADER_WASH[tone])}>
      <div aria-hidden className="pointer-events-none absolute -top-20 right-20 size-52 rounded-full bg-lime/50 blur-2xl" />
      <div aria-hidden className="pointer-events-none absolute -right-12 -bottom-24 size-60 rounded-full bg-coral/40 blur-2xl" />
      <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          {kicker && <p className="mb-1.5 text-xs font-semibold tracking-[0.08em] text-ink/50 uppercase">{kicker}</p>}
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">{title}</h1>
          {description && <p className="mt-2 max-w-2xl text-sm text-ink/70">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {stats && stats.length > 0 && (
        <dl className="relative mt-6 flex flex-wrap gap-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl bg-white/75 px-4 py-2.5 shadow-[0_1px_2px_rgba(45,42,62,0.06)]">
              <dt className="text-xs font-medium text-ink/55">{s.label}</dt>
              <dd className="font-display text-xl font-bold tabular-nums text-ink">{s.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section className={cx("rounded-3xl border border-white/80 bg-white/80 p-4 shadow-[0_10px_30px_-18px_rgba(95,79,168,0.45)] sm:p-6", className)}>
      {children}
    </section>
  );
}

export function EmptyState({ title, children, actions }: { title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-ink/20 bg-white px-6 py-14 text-center">
      <span aria-hidden className="mx-auto mb-4 inline-flex size-11 items-center justify-center rounded-xl bg-lime/40 text-ink">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path d="M4 7.5L12 3l8 4.5v9L12 21l-8-4.5zM4 7.5l8 4.5 8-4.5M12 12v9" /></svg>
      </span>
      <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
      {children && <div className="mx-auto mt-2 max-w-md text-sm text-ink/60">{children}</div>}
      {actions && <div className="mt-5 flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  );
}

export function LowStockBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-coral/45 px-2 py-0.5 text-xs font-semibold text-(--peach-ink)">
      <span aria-hidden>▼</span> Low stock
    </span>
  );
}

export function StatusBadge({ active, activeLabel = "Active", inactiveLabel = "Archived" }: { active: boolean; activeLabel?: string; inactiveLabel?: string }) {
  return active ? (
    <span className="inline-flex rounded-md bg-lime/60 px-2 py-0.5 text-xs font-semibold text-(--sage-ink)">{activeLabel}</span>
  ) : (
    <span className="inline-flex rounded-md bg-ink/[0.06] px-2 py-0.5 text-xs font-semibold text-ink/70">{inactiveLabel}</span>
  );
}

/** Direction shown by sign, arrow and colour together (never colour alone). */
export function DeltaBadge({ delta }: { delta: number }) {
  const up = delta > 0;
  return (
    <span className={cx("inline-flex items-center gap-1 font-semibold tabular-nums", up ? "text-(--sage-ink)" : "text-(--peach-ink)")}>
      <span aria-hidden>{up ? "▲" : "▼"}</span>
      <span>{formatDelta(delta)}</span>
      <span className="sr-only">{up ? "added" : "removed"}</span>
    </span>
  );
}

export function MovementTypeBadge({ type }: { type: MovementType }) {
  const styles: Record<MovementType, string> = {
    stock_in: "bg-lime/60 text-(--sage-ink)",
    stock_out: "bg-coral/45 text-(--peach-ink)",
    adjustment: "bg-lilac/70 text-(--lav-ink)",
  };
  return <span className={cx("inline-flex rounded-md px-2 py-0.5 text-xs font-semibold", styles[type])}>{MOVEMENT_LABELS[type]}</span>;
}

export function Pagination({ page, pageSize, total, href }: { page: number; pageSize: number; total: number; href: (page: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between gap-3 text-sm text-ink/60">
      <p>
        Showing <span className="font-medium text-ink">{from}</span>–<span className="font-medium text-ink">{to}</span> of{" "}
        <span className="font-medium text-ink">{total}</span>
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <LinkButton variant="secondary" href={href(page - 1)} rel="prev">
            Previous
          </LinkButton>
        ) : (
          <span className={buttonClass("secondary", "pointer-events-none opacity-50")} aria-disabled>
            Previous
          </span>
        )}
        {page < pages ? (
          <LinkButton variant="secondary" href={href(page + 1)} rel="next">
            Next
          </LinkButton>
        ) : (
          <span className={buttonClass("secondary", "pointer-events-none opacity-50")} aria-disabled>
            Next
          </span>
        )}
      </div>
    </nav>
  );
}
