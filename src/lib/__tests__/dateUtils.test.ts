import { describe, it, expect } from "vitest";
import { formatDate, formatDateIso } from "../dateUtils";

describe("formatDate", () => {
  it("returns an em dash for null/undefined/empty input", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
    expect(formatDate("")).toBe("—");
    expect(formatDate(0)).toBe("—");
  });

  it("returns an em dash for invalid dates", () => {
    expect(formatDate("not-a-date")).toBe("—");
    expect(formatDate(new Date("invalid"))).toBe("—");
  });

  it("formats a Date object deterministically (UTC)", () => {
    expect(formatDate(new Date(Date.UTC(2026, 10, 9, 15, 30)))).toBe("Nov 9, 2026");
  });

  it("formats an ISO string deterministically (UTC)", () => {
    expect(formatDate("2026-11-09T15:30:00Z")).toBe("Nov 9, 2026");
  });

  it("formats a numeric timestamp", () => {
    const ts = Date.UTC(2026, 0, 1, 0, 0, 0);
    expect(formatDate(ts)).toBe("Jan 1, 2026");
  });
});

describe("formatDateIso", () => {
  it("returns an em dash for null/undefined/empty input", () => {
    expect(formatDateIso(null)).toBe("—");
    expect(formatDateIso(undefined)).toBe("—");
    expect(formatDateIso("")).toBe("—");
  });

  it("returns an em dash for invalid dates", () => {
    expect(formatDateIso("not-a-date")).toBe("—");
  });

  it("formats a Date to YYYY-MM-DD (UTC)", () => {
    expect(formatDateIso(new Date(Date.UTC(2026, 10, 9, 15, 30)))).toBe("2026-11-09");
  });

  it("formats an ISO string to YYYY-MM-DD", () => {
    expect(formatDateIso("2026-11-09T15:30:00Z")).toBe("2026-11-09");
  });

  it("formats a numeric timestamp", () => {
    const ts = Date.UTC(2026, 0, 1, 0, 0, 0);
    expect(formatDateIso(ts)).toBe("2026-01-01");
  });
});
