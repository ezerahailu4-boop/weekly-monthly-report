import { NextResponse } from "next/server";

/**
 * In-memory fixed-window rate limiter.
 * Suitable for single-instance serverless deployments.
 * Keys are client IP addresses; windows are 60 seconds.
 */
interface RateLimitWindow {
  count: number;
  resetAt: number;
}

const windows = new Map<string, RateLimitWindow>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60 * 1000;

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

export function rateLimit(request: Request, opts?: { max?: number; windowMs?: number }): {
  success: boolean;
  remaining: number;
  reset: number;
} {
  const max = opts?.max ?? MAX_ATTEMPTS;
  const windowMs = opts?.windowMs ?? WINDOW_MS;
  const ip = getClientIp(request);
  const now = Date.now();

  const existing = windows.get(ip);
  if (!existing || now > existing.resetAt) {
    windows.set(ip, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: max - 1, reset: now + windowMs };
  }

  existing.count += 1;
  return {
    success: existing.count <= max,
    remaining: Math.max(0, max - existing.count),
    reset: existing.resetAt,
  };
}

export function cleanupRateLimitWindows(): void {
  const now = Date.now();
  for (const [key, window] of windows.entries()) {
    if (now > window.resetAt) windows.delete(key);
  }
}
