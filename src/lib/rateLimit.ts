/**
 * Simple in-memory rate limiter.
 *
 * Good enough for a single-instance deployment (e.g. one Vercel serverless
 * function or a small Node server). For multi-instance setups, swap the
 * Map for Upstash Redis or a shared store later.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Periodically remove expired buckets so the Map does not grow unbounded.
const CLEANUP_INTERVAL_MS = 60 * 1000;
let lastCleanup = 0;

/**
 * Returns true when the caller has exceeded `maxAttempts` within
 * `windowMs`, false otherwise. Each call consumes one attempt.
 */
export function rateLimit(key: string, maxAttempts: number, windowMs: number): boolean {
  const now = Date.now();

  if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
    lastCleanup = now;
    for (const [k, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(k);
    }
  }

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  if (existing.count >= maxAttempts) {
    return true;
  }

  existing.count += 1;
  return false;
}

/** Test helper: clears all tracked buckets. */
export function resetRateLimits(): void {
  buckets.clear();
}
