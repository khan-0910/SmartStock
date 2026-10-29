import type { MovementType } from "./types";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const integer = new Intl.NumberFormat("en-US");
const dateTime = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

export function formatMoney(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? money.format(n) : "—";
}

export function formatInt(value: number | string | null | undefined) {
  if (value === null || value === undefined) return "0";
  return integer.format(Number(value));
}

/** Timestamps are shown in UTC so server and browser render identically. */
export function formatDateTime(iso: string) {
  return `${dateTime.format(new Date(iso))} UTC`;
}

export function formatDelta(delta: number) {
  return delta > 0 ? `+${integer.format(delta)}` : `−${integer.format(Math.abs(delta))}`;
}

export const MOVEMENT_LABELS: Record<MovementType, string> = {
  stock_in: "Stock in",
  stock_out: "Stock out",
  adjustment: "Adjustment",
};

/** Build a query string from params, dropping empty values. */
export function qs(params: Record<string, string | number | undefined | null>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}
