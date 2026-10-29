import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { formatDelta, MOVEMENT_LABELS } from "@/lib/format";
import type { MovementType } from "@/lib/types";

// Small shared building blocks. Server-safe (no hooks).

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const BUTTON = {
  primary: "bg-ink text-paper hover:bg-brand-600 disabled:bg-ink/50",
  secondary: "bg-white text-ink ring-1 ring-inset ring-ink/20 hover:bg-paper-deep disabled:text-ink/60",
  danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600/60",
  ghost: "text-ink/80 hover:bg-paper",
} as const;

export type ButtonVariant = keyof typeof BUTTON;

export function buttonClass(variant: ButtonVariant = "primary", extra?: string) {
  return cx(
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-[background-color,color,transform] duration-200 active:scale-[0.97] disabled:cursor-not-allowed",
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
  "block w-full min-h-11 rounded-xl border-2 border-ink/15 bg-white px-3.5 py-2 text-sm text-ink placeholder:text-ink/35 transition-[border-color,box-shadow] duration-200 hover:border-ink/30 focus:border-brand-600 focus:shadow-[0_0_0_4px_rgba(91,61,245,0.15)] focus:outline-none aria-[invalid=true]:border-coral";

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
    info: "border-ink bg-lilac text-ink",
    success: "border-ink bg-lime text-ink",
    error: "border-ink bg-coral text-ink",
    warning: "border-ink bg-sun text-ink",
  };
  const icons = { info: "ℹ", success: "✓", error: "✕", warning: "!" };
  return (
    <div role={role} className={cx("flex animate-[pop_0.5s_var(--ease-out-expo)_both] gap-3 rounded-2xl border-2 p-3.5 text-sm shadow-[3px_3px_0_0_var(--color-ink)]", tones[tone])}>
      <span aria-hidden className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-paper">
        {icons[tone]}
      </span>
      <div className="space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children}
      </div>
    </div>
  );
}

export function PageHeader({ title, description, actions, kicker }: { title: string; description?: ReactNode; actions?: ReactNode; kicker?: string }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {kicker && <p className="mb-1 text-xs font-bold tracking-[0.14em] text-brand-600 uppercase">{kicker}</p>}
        <h1 className="font-display text-4xl font-extrabold tracking-[-0.03em] text-ink sm:text-5xl">
          {title}
          <span aria-hidden className="text-coral">.</span>
        </h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-ink/60">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cx("rounded-[1.75rem] border-2 border-ink/10 bg-white p-4 sm:p-6", className)}>{children}</section>;
}

export function EmptyState({ title, children, actions }: { title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border-2 border-dashed border-ink/25 bg-white px-6 py-14 text-center">
      <div aria-hidden className="mx-auto mb-5 flex w-fit -space-x-3">
        <span className="size-12 -rotate-12 rounded-2xl border-2 border-ink bg-lime" />
        <span className="size-12 rotate-6 rounded-2xl border-2 border-ink bg-coral" />
        <span className="size-12 -rotate-3 rounded-2xl border-2 border-ink bg-lilac" />
      </div>
      <h2 className="font-display text-xl font-bold text-ink">{title}</h2>
      {children && <div className="mx-auto mt-2 max-w-md text-sm text-ink/60">{children}</div>}
      {actions && <div className="mt-5 flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  );
}

export function LowStockBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-sun px-2 py-0.5 text-xs font-semibold text-ink">
      <span aria-hidden>▼</span> Low stock
    </span>
  );
}

export function StatusBadge({ active, activeLabel = "Active", inactiveLabel = "Archived" }: { active: boolean; activeLabel?: string; inactiveLabel?: string }) {
  return active ? (
    <span className="inline-flex rounded-full bg-teal/20 px-2.5 py-0.5 text-xs font-semibold text-ink ring-1 ring-teal">{activeLabel}</span>
  ) : (
    <span className="inline-flex rounded-full bg-ink/5 px-2.5 py-0.5 text-xs font-semibold text-ink/70 ring-1 ring-ink/20">{inactiveLabel}</span>
  );
}

/** Direction shown by sign, arrow and colour together (never colour alone). */
export function DeltaBadge({ delta }: { delta: number }) {
  const up = delta > 0;
  return (
    <span className={cx("inline-flex items-center gap-1 font-semibold tabular-nums", up ? "text-emerald-700" : "text-red-700")}>
      <span aria-hidden>{up ? "▲" : "▼"}</span>
      <span>{formatDelta(delta)}</span>
      <span className="sr-only">{up ? "added" : "removed"}</span>
    </span>
  );
}

export function MovementTypeBadge({ type }: { type: MovementType }) {
  const styles: Record<MovementType, string> = {
    stock_in: "bg-lime",
    stock_out: "bg-coral",
    adjustment: "bg-lilac",
  };
  return <span className={cx("inline-flex rounded-full border border-ink px-2.5 py-0.5 text-xs font-bold text-ink", styles[type])}>{MOVEMENT_LABELS[type]}</span>;
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
