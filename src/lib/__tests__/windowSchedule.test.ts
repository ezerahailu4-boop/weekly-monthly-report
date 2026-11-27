import { describe, it, expect } from "vitest";
import {
  parseTimeToMinutes,
  formatTime12h,
  formatDayTimeLabel,
  formatCountdown,
  evaluateReportingWindow,
  DEFAULT_WINDOW_CONFIG,
  ETHIOPIA_TIMEZONE,
} from "../windowSchedule";

describe("parseTimeToMinutes", () => {
  it("parses valid HH:MM strings", () => {
    expect(parseTimeToMinutes("00:00")).toBe(0);
    expect(parseTimeToMinutes("06:00")).toBe(360);
    expect(parseTimeToMinutes("13:45")).toBe(825);
    expect(parseTimeToMinutes("23:59")).toBe(1439);
  });

  it("parses single-digit hours", () => {
    expect(parseTimeToMinutes("6:00")).toBe(360);
    expect(parseTimeToMinutes("9:05")).toBe(545);
  });

  it("returns 0 for invalid input", () => {
    expect(parseTimeToMinutes("")).toBe(0);
    expect(parseTimeToMinutes("not-a-time")).toBe(0);
    expect(parseTimeToMinutes("25:00")).toBe(0);
    expect(parseTimeToMinutes("10:60")).toBe(0);
    expect(parseTimeToMinutes(null as unknown as string)).toBe(0);
  });
});

describe("formatTime12h", () => {
  it("converts 24h to 12h AM/PM format", () => {
    expect(formatTime12h("00:00")).toBe("12:00 AM");
    expect(formatTime12h("06:00")).toBe("6:00 AM");
    expect(formatTime12h("12:00")).toBe("12:00 PM");
    expect(formatTime12h("13:00")).toBe("1:00 PM");
    expect(formatTime12h("23:59")).toBe("11:59 PM");
  });

  it("returns empty-ish for invalid input", () => {
    // parseTimeToMinutes returns 0 for invalid, which formats as 12:00 AM
    expect(formatTime12h("")).toBe("12:00 AM");
  });
});

describe("formatDayTimeLabel", () => {
  it("formats day and time with EAT suffix", () => {
    expect(formatDayTimeLabel(0, "06:00")).toBe("Sunday at 6:00 AM EAT");
    expect(formatDayTimeLabel(5, "04:00")).toBe("Friday at 4:00 AM EAT");
    expect(formatDayTimeLabel(1, "13:30")).toBe("Monday at 1:30 PM EAT");
  });

  it("normalizes out-of-range day indices", () => {
    expect(formatDayTimeLabel(7, "06:00")).toBe("Sunday at 6:00 AM EAT");
    expect(formatDayTimeLabel(-1, "06:00")).toBe("Saturday at 6:00 AM EAT");
  });
});

describe("formatCountdown", () => {
  it("returns 'less than a minute' for zero or negative", () => {
    expect(formatCountdown(0)).toBe("less than a minute");
    expect(formatCountdown(-5)).toBe("less than a minute");
  });

  it("formats minutes-only", () => {
    expect(formatCountdown(5)).toBe("5m");
    expect(formatCountdown(59)).toBe("59m");
  });

  it("formats hours and minutes", () => {
    expect(formatCountdown(60)).toBe("1h");
    expect(formatCountdown(90)).toBe("1h 30m");
    expect(formatCountdown(65)).toBe("1h 5m");
  });

  it("formats days, hours, and minutes", () => {
    expect(formatCountdown(1440)).toBe("1d");
    expect(formatCountdown(1500)).toBe("1d 1h");
    // Minutes are only shown when days === 0 (per implementation guard)
    expect(formatCountdown(2000)).toBe("1d 9h");
  });
});

describe("evaluateReportingWindow", () => {
  const baseConfig = { ...DEFAULT_WINDOW_CONFIG };

  it("defaults to scheduled mode with Friday 06:00 - Monday 04:00 EAT", () => {
    const status = evaluateReportingWindow(baseConfig);
    expect(status.mode).toBe("scheduled");
    expect(status.config.window_mode).toBe("scheduled");
    expect(status.config.open_day).toBe(5);
    expect(status.config.close_day).toBe(1);
  });

  it("force_open always returns isOpen=true", () => {
    const status = evaluateReportingWindow({ ...baseConfig, window_mode: "force_open" });
    expect(status.isOpen).toBe(true);
    expect(status.reason).toBe("force_open");
    expect(status.countdownLabel).toContain("Manually opened");
  });

  it("force_closed always returns isOpen=false", () => {
    const status = evaluateReportingWindow({ ...baseConfig, window_mode: "force_closed" });
    expect(status.isOpen).toBe(false);
    expect(status.reason).toBe("force_closed");
    expect(status.countdownLabel).toContain("Manually closed");
  });

  it("uses EAT timezone by default", () => {
    expect(ETHIOPIA_TIMEZONE).toBe("Africa/Addis_Ababa");
    const status = evaluateReportingWindow(baseConfig);
    expect(status.config.timezone).toBe("Africa/Addis_Ababa");
  });

  it("compute minutesUntilChange as non-negative", () => {
    const status = evaluateReportingWindow(baseConfig);
    expect(status.minutesUntilChange).toBeGreaterThanOrEqual(0);
    expect(typeof status.minutesUntilChange).toBe("number");
  });
});
