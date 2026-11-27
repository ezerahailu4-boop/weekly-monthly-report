import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  rateLimit,
  cleanupRateLimitWindows,
  clearAllRateLimitWindows,
} from "../rateLimit";

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request("https://example.com/api/test", { headers });
}

describe("rateLimit", () => {
  beforeEach(() => {
    clearAllRateLimitWindows();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-27T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows up to max attempts and blocks subsequent ones within the window", () => {
    const req = makeRequest({ "x-forwarded-for": "10.0.0.1" });
    expect(rateLimit(req, { max: 3, windowMs: 60_000, scope: "login" })).toMatchObject({
      success: true,
      remaining: 2,
    });
    expect(rateLimit(req, { max: 3, windowMs: 60_000, scope: "login" })).toMatchObject({
      success: true,
      remaining: 1,
    });
    expect(rateLimit(req, { max: 3, windowMs: 60_000, scope: "login" })).toMatchObject({
      success: true,
      remaining: 0,
    });
    expect(rateLimit(req, { max: 3, windowMs: 60_000, scope: "login" })).toMatchObject({
      success: false,
      remaining: 0,
    });
  });

  it("isolates buckets by scope and by client IP", () => {
    const reqA = makeRequest({ "x-forwarded-for": "10.0.0.1, 127.0.0.1" });
    const reqB = makeRequest({ "x-real-ip": "10.0.0.2" });

    expect(rateLimit(reqA, { max: 1, scope: "scope-a" }).success).toBe(true);
    expect(rateLimit(reqA, { max: 1, scope: "scope-a" }).success).toBe(false);

    // Different scope for same IP succeeds
    expect(rateLimit(reqA, { max: 1, scope: "scope-b" }).success).toBe(true);
    // Different IP for same scope succeeds
    expect(rateLimit(reqB, { max: 1, scope: "scope-a" }).success).toBe(true);
  });

  it("resets the window after windowMs elapses", () => {
    const req = makeRequest({ "x-forwarded-for": "10.0.0.3" });
    expect(rateLimit(req, { max: 1, windowMs: 10_000, scope: "test" }).success).toBe(true);
    expect(rateLimit(req, { max: 1, windowMs: 10_000, scope: "test" }).success).toBe(false);

    vi.advanceTimersByTime(10_001);
    expect(rateLimit(req, { max: 1, windowMs: 10_000, scope: "test" }).success).toBe(true);
  });

  it("evicts expired windows during cleanupRateLimitWindows", () => {
    const req = makeRequest({ "x-forwarded-for": "10.0.0.4" });
    rateLimit(req, { max: 2, windowMs: 5_000, scope: "cleanup" });

    vi.advanceTimersByTime(5_001);
    cleanupRateLimitWindows();

    const result = rateLimit(req, { max: 2, windowMs: 5_000, scope: "cleanup" });
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(1);
  });
});
