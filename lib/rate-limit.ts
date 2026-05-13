const buckets = new Map<string, number[]>();

/** Simple in-memory fixed-window rate limiter (OK for single-node MVP). Replace with Upstash for production scale. */
export function rateLimitSync(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;
  const hits = buckets.get(key)?.filter((t) => t > windowStart) ?? [];
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  return true;
}
