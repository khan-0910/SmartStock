// Currency conversion maths. Prices are stored in USD (numeric(12,2)).
// `rate` is units of the other currency per 1 USD, e.g. INR 95.27.

/** "1250.50" INR at 95.27 -> "13.13" USD. Rounded half-up to cents. */
export function toUsd(amount: string, rate: number): string {
  if (!(rate > 0)) throw new Error("Invalid exchange rate");
  const usd = Number(amount) / rate;
  return (Math.round((usd + Number.EPSILON) * 100) / 100).toFixed(2);
}

/** USD amount shown in another currency (for display only). */
export function fromUsd(usd: number | string, rate: number): number {
  return Number(usd) * rate;
}
