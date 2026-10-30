"use client";

import { useEffect, useRef } from "react";
import { moneyFormat } from "@/lib/format";

/**
 * Counts from 0 to `value` once on mount (ease-out, ~0.9s). Renders the final
 * value on the server and for reduced-motion users, so there is no flash and
 * screen readers always get the real number.
 */
export function CountUp({ value, format = "int", currency = "USD" }: { value: number; format?: "int" | "money"; currency?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const fmt =
    format === "money" ? moneyFormat(currency) : new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el || !Number.isFinite(value) || value === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const start = performance.now();
    const duration = 900;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      el.textContent = fmt.format(format === "money" ? value * eased : Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // fmt is derived from format; value/format are the real inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, format, currency]);

  return (
    <span ref={ref} className="tabular-nums">
      {fmt.format(value)}
    </span>
  );
}
