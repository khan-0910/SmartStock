import type { MovementType } from "./types";

const integer = new Intl.NumberFormat("en-US");
const dateTime = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

export const CURRENCIES = [
  { code: "USD", label: "US dollar" },
  { code: "EUR", label: "Euro" },
  { code: "GBP", label: "British pound" },
  { code: "JPY", label: "Japanese yen" },
  { code: "INR", label: "Indian rupee" },
  { code: "SGD", label: "Singapore dollar" },
] as const;
export type Currency = (typeof CURRENCIES)[number]["code"];

const moneyFormats = new Map<string, Intl.NumberFormat>();
/** Intl picks the right symbol and decimals per currency (e.g. JPY has none). */
export function moneyFormat(currency: string = "USD") {
  let f = moneyFormats.get(currency);
  if (!f) {
    f = new Intl.NumberFormat("en-US", { style: "currency", currency });
    moneyFormats.set(currency, f);
  }
  return f;
}

export function formatMoney(value: number | string | null | undefined, currency: string = "USD") {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? moneyFormat(currency).format(n) : "—";
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
