/**
 * In-memory fixed-window rate limiter with automatic stale-window eviction.
 * Keys are client IP addresses + route scope; windows default to 60 seconds.
 */
interface RateLimitWindow {
  count: number;
  resetAt: number;
}

const windows = new Map<string, RateLimitWindow>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60 * 1000;
const MAX_TRACKED_KEYS = 5000;

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

export function rateLimit(
  request: Request,
  opts?: { max?: number; windowMs?: number; scope?: string }
): {
  success: boolean;
  remaining: number;
  reset: number;
} {
  const max = opts?.max ?? MAX_ATTEMPTS;
  const windowMs = opts?.windowMs ?? WINDOW_MS;
  const scope = opts?.scope || "default";
  const key = `${scope}:${getClientIp(request)}`;
  const now = Date.now();

  if (windows.size > MAX_TRACKED_KEYS) {
    cleanupRateLimitWindows(now);
  }

  const existing = windows.get(key);
  if (!existing || now > existing.resetAt) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: max - 1, reset: now + windowMs };
  }

  existing.count += 1;
  return {
    success: existing.count <= max,
    remaining: Math.max(0, max - existing.count),
    reset: existing.resetAt,
  };
}

export function cleanupRateLimitWindows(now: number = Date.now()): void {
  for (const [key, window] of windows.entries()) {
    if (now > window.resetAt) windows.delete(key);
  }
}

export function clearAllRateLimitWindows(): void {
  windows.clear();
}
