import "server-only";
import { cache } from "react";
import { z } from "zod";
import { CURRENCIES, formatMoney } from "./format";
import { fromUsd } from "./fx-math";

const RATES_URL = `https://api.frankfurter.dev/v1/latest?base=USD&symbols=${CURRENCIES.map((c) => c.code)
  .filter((c) => c !== "USD")
  .join(",")}`;

const ratesResponse = z.object({ date: z.string(), rates: z.record(z.string(), z.number().positive().finite()) });

export type UsdRates = { date: string; rates: Record<string, number> };

/**
 * Daily reference rates (European Central Bank, via Frankfurter), cached for
 * 12 hours. Returns null when the feed is unreachable; callers then either
 * refuse to convert (saving) or fall back to showing USD (display).
 */
export const getUsdRates = cache(async (): Promise<UsdRates | null> => {
  try {
    const res = await fetch(RATES_URL, { next: { revalidate: 43_200 }, signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const parsed = ratesResponse.safeParse(await res.json());
    if (!parsed.success) return null;
    return { date: parsed.data.date, rates: { ...parsed.data.rates, USD: 1 } };
  } catch {
    return null;
  }
});

/**
 * Money display for a workspace: stored USD amounts converted to the
 * workspace currency. If no rate is available the amount is shown in USD,
 * so a number is never labelled with the wrong currency.
 */
export async function moneyDisplay(currency: string) {
  const rate = currency === "USD" ? 1 : (await getUsdRates())?.rates[currency];
  const shown = rate ? currency : "USD";
  const convert = (usd: number | string | null | undefined) =>
    usd === null || usd === undefined || usd === "" ? null : fromUsd(usd, rate ?? 1);
  return {
    currency: shown,
    converted: shown !== currency ? false : true,
    convert,
    format: (usd: number | string | null | undefined) => formatMoney(convert(usd), shown),
  };
}
