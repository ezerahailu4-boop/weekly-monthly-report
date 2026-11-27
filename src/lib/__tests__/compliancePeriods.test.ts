import { describe, it, expect } from "vitest";
import type { ReportRow } from "@/types/report";
import { getWeekBounds, getMonthBounds, findBestReportInPeriod } from "../compliancePeriods";

const makeReport = (overrides: Partial<ReportRow> = {}): ReportRow => ({
  id: "r-1",
  user_id: "u-1",
  company_id: "c-1",
  company_name: "YETAF Holding",
  report_type: "weekly",
  period_start: "2026-11-02",
  period_end: "2026-11-08",
  status: "draft",
  data: {} as never,
  created_at: "2026-11-08T10:00:00Z",
  updated_at: "2026-11-08T10:00:00Z",
  ...overrides,
});

describe("getWeekBounds", () => {
  it("returns Monday..Sunday bounds for a given date", () => {
    // 2026-11-09 is a Monday
    const bounds = getWeekBounds("2026-11-09");
    expect(bounds.start).toBe("2026-11-09");
    expect(bounds.end).toBe("2026-11-15");
  });

  it("correctly backs up to Monday when given a weekend date", () => {
    // 2026-11-14 is a Saturday
    const bounds = getWeekBounds("2026-11-14");
    expect(bounds.start).toBe("2026-11-09");
    expect(bounds.end).toBe("2026-11-15");
  });

  it("handles Sunday by going back 6 days to Monday", () => {
    // 2026-11-15 is a Sunday
    const bounds = getWeekBounds("2026-11-15");
    expect(bounds.start).toBe("2026-11-09");
    expect(bounds.end).toBe("2026-11-15");
  });

  it("handles a Friday input", () => {
    // 2026-11-13 is a Friday
    const bounds = getWeekBounds("2026-11-13");
    expect(bounds.start).toBe("2026-11-09");
    expect(bounds.end).toBe("2026-11-15");
  });
});

describe("getMonthBounds", () => {
  it("returns first and last day of month", () => {
    const bounds = getMonthBounds("2026-11");
    expect(bounds.start).toBe("2026-11-01");
    expect(bounds.end).toBe("2026-11-30");
  });

  it("handles February leap year", () => {
    const bounds = getMonthBounds("2024-02");
    expect(bounds.start).toBe("2024-02-01");
    expect(bounds.end).toBe("2024-02-29");
  });

  it("defaults year/month when NaN", () => {
    const bounds = getMonthBounds("invalid-month");
    expect(bounds.start).toBe("2026-01-01");
  });
});

describe("findBestReportInPeriod", () => {
  it("returns null when no reports match user/type/period", () => {
    const reports = [makeReport({ user_id: "u-1", report_type: "weekly" })];
    expect(findBestReportInPeriod(reports, "u-99", "weekly", "2026-11-02", "2026-11-08")).toBeNull();
    expect(findBestReportInPeriod(reports, "u-1", "monthly", "2026-11-01", "2026-11-30")).toBeNull();
  });

  it("returns the only matching report", () => {
    const reports = [makeReport({ user_id: "u-1", report_type: "weekly" })];
    const best = findBestReportInPeriod(reports, "u-1", "weekly", "2026-11-02", "2026-11-08");
    expect(best).toEqual(reports[0]);
  });

  it("filters by period overlap (inclusive)", () => {
    const reports = [
      makeReport({ id: "r-a", period_start: "2026-11-02", period_end: "2026-11-08" }),
      makeReport({ id: "r-b", period_start: "2026-10-26", period_end: "2026-11-01" }),
    ];
    const best = findBestReportInPeriod(reports, "u-1", "weekly", "2026-11-02", "2026-11-08");
    expect(best?.id).toBe("r-a");
  });

  it("picks higher-status report when multiple match", () => {
    const reports = [
      makeReport({ id: "r-draft", status: "draft", period_start: "2026-11-02", period_end: "2026-11-08" }),
      makeReport({ id: "r-submitted", status: "submitted", period_start: "2026-11-02", period_end: "2026-11-08" }),
      makeReport({ id: "r-reviewed", status: "reviewed", period_start: "2026-11-02", period_end: "2026-11-08" }),
    ];
    const best = findBestReportInPeriod(reports, "u-1", "weekly", "2026-11-02", "2026-11-08");
    expect(best?.id).toBe("r-reviewed");
  });

  it("breaks status ties by newest created_at", () => {
    const reports = [
      makeReport({ id: "r-old", status: "submitted", created_at: "2026-11-08T09:00:00Z", period_start: "2026-11-02", period_end: "2026-11-08" }),
      makeReport({ id: "r-new", status: "submitted", created_at: "2026-11-08T11:00:00Z", period_start: "2026-11-02", period_end: "2026-11-08" }),
    ];
    const best = findBestReportInPeriod(reports, "u-1", "weekly", "2026-11-02", "2026-11-08");
    expect(best?.id).toBe("r-new");
  });
});
