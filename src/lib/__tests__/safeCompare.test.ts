import { describe, it, expect } from "vitest";
import { safeTimingCompare } from "../safeCompare";

describe("safeTimingCompare", () => {
  it("returns true for identical non-empty strings", () => {
    expect(safeTimingCompare("hello", "hello")).toBe(true);
    expect(safeTimingCompare("a".repeat(1000), "a".repeat(1000))).toBe(true);
  });

  it("returns false for empty strings (falsy guard in implementation)", () => {
    expect(safeTimingCompare("", "")).toBe(false);
    expect(safeTimingCompare("", "a")).toBe(false);
    expect(safeTimingCompare("a", "")).toBe(false);
  });

  it("returns false for different strings", () => {
    expect(safeTimingCompare("hello", "world")).toBe(false);
    expect(safeTimingCompare("abc", "abd")).toBe(false);
    expect(safeTimingCompare("a".repeat(1000), "a".repeat(999) + "b")).toBe(false);
  });

  it("returns false when either value is not a string", () => {
    expect(safeTimingCompare(null, "hello")).toBe(false);
    expect(safeTimingCompare(undefined, "hello")).toBe(false);
    expect(safeTimingCompare("hello", null)).toBe(false);
    expect(safeTimingCompare("hello", undefined)).toBe(false);
    expect(safeTimingCompare(null, undefined)).toBe(false);
    expect(safeTimingCompare(123 as unknown as string, "123")).toBe(false);
  });

  it("handles different-length strings of same prefix in constant time", () => {
    // Should not throw RangeError even with different lengths
    expect(safeTimingCompare("abc", "abcd")).toBe(false);
    expect(safeTimingCompare("abcd", "abc")).toBe(false);
  });
});
