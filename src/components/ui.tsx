import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { formatDelta, MOVEMENT_LABELS } from "@/lib/format";
import type { MovementType } from "@/lib/types";

// Small shared building blocks. Server-safe (no hooks).

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const BUTTON = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-600/60",
  secondary: "bg-white text-slate-800 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:text-slate-400",
  danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600/60",
  ghost: "text-slate-700 hover:bg-slate-100",
} as const;

export type ButtonVariant = keyof typeof BUTTON;

export function buttonClass(variant: ButtonVariant = "primary", extra?: string) {
  return cx(
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed",
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
  "block w-full min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-600 aria-[invalid=true]:border-red-500";

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
      <label htmlFor={id} className="block text-sm font-medium text-slate-800">
        {label}
        {required ? <span className="text-red-600"> *</span> : <span className="font-normal text-slate-500"> (optional)</span>}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-red-700">
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
    info: "border-brand-100 bg-brand-50 text-brand-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    error: "border-red-200 bg-red-50 text-red-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
  };
  const icons = { info: "ℹ", success: "✓", error: "✕", warning: "!" };
  return (
    <div role={role} className={cx("flex gap-3 rounded-lg border p-3 text-sm", tones[tone])}>
      <span aria-hidden className="font-bold">
        {icons[tone]}
      </span>
      <div className="space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children}
      </div>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cx("rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5", className)}>{children}</section>;
}

export function EmptyState({ title, children, actions }: { title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {children && <div className="mx-auto mt-2 max-w-md text-sm text-slate-600">{children}</div>}
      {actions && <div className="mt-5 flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  );
}

export function LowStockBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
      <span aria-hidden>▼</span> Low stock
    </span>
  );
}

export function StatusBadge({ active, activeLabel = "Active", inactiveLabel = "Archived" }: { active: boolean; activeLabel?: string; inactiveLabel?: string }) {
  return active ? (
    <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">{activeLabel}</span>
  ) : (
    <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-300">{inactiveLabel}</span>
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
    stock_in: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    stock_out: "bg-red-50 text-red-800 ring-red-200",
    adjustment: "bg-violet-50 text-violet-800 ring-violet-200",
  };
  return <span className={cx("inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1", styles[type])}>{MOVEMENT_LABELS[type]}</span>;
}

export function Pagination({ page, pageSize, total, href }: { page: number; pageSize: number; total: number; href: (page: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-600">
      <p>
        Showing <span className="font-medium text-slate-900">{from}</span>–<span className="font-medium text-slate-900">{to}</span> of{" "}
        <span className="font-medium text-slate-900">{total}</span>
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
