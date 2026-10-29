import "server-only";
import { headers } from "next/headers";

// Best-effort, in-memory fixed-window limiter. It protects a single server
// instance from rapid-fire abuse (password guessing, sign-up spam). On
// serverless hosts each instance has its own memory, so treat this as a
// speed bump in front of Supabase Auth's own rate limits, not a guarantee.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
const MAX_KEYS = 10_000;

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** Returns seconds to wait when the limit is exceeded, otherwise 0. */
export function rateLimit(key: string, limit: number, windowMs: number): number {
  const now = Date.now();
  if (buckets.size > MAX_KEYS) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return 0;
  }
  bucket.count += 1;
  return bucket.count > limit ? Math.ceil((bucket.resetAt - now) / 1000) : 0;
}
