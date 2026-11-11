export type WindowMode = "scheduled" | "force_open" | "force_closed";

export interface ReportingWindowConfig {
  window_mode: WindowMode;
  open_day: number; // 0 (Sunday) .. 6 (Saturday)
  open_time: string; // "HH:MM" 24-hour format in EAT
  close_day: number; // 0 (Sunday) .. 6 (Saturday)
  close_time: string; // "HH:MM" 24-hour format in EAT
  timezone: string; // Default: "Africa/Addis_Ababa"
}

export interface ReportingWindowStatus {
  isOpen: boolean;
  mode: WindowMode;
  reason: "scheduled_open" | "scheduled_closed" | "force_open" | "force_closed";
  config: ReportingWindowConfig;
  currentEthTimeLabel: string;
  currentDayIndex: number;
  openLabel: string;
  closeLabel: string;
  countdownLabel: string;
  minutesUntilChange: number;
}

export const ETHIOPIA_TIMEZONE = "Africa/Addis_Ababa";

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const DEFAULT_WINDOW_CONFIG: ReportingWindowConfig = {
  window_mode: "scheduled",
  open_day: 5, // Friday
  open_time: "06:00", // 06:00 AM EAT
  close_day: 1, // Monday
  close_time: "04:00", // 04:00 AM EAT
  timezone: ETHIOPIA_TIMEZONE,
};

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const MINUTES_PER_DAY = 1440;
const MINUTES_PER_WEEK = 7 * MINUTES_PER_DAY;

/** Parse "HH:MM" into minutes since 00:00 (0..1439). */
export function parseTimeToMinutes(timeStr: string): number {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec((timeStr || "").trim());
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Format "HH:MM" (24h) as readable 12-hour string e.g. "6:00 AM". */
export function formatTime12h(timeStr: string): string {
  const totalMins = parseTimeToMinutes(timeStr);
  const h24 = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

export function formatDayTimeLabel(day: number, timeStr: string): string {
  const safeDay = ((day % 7) + 7) % 7;
  return `${DAY_NAMES[safeDay]} at ${formatTime12h(timeStr)} EAT`;
}

export function formatCountdown(totalMinutes: number): string {
  if (totalMinutes <= 0) return "less than a minute";
  const days = Math.floor(totalMinutes / MINUTES_PER_DAY);
  const rem = totalMinutes % MINUTES_PER_DAY;
  const hours = Math.floor(rem / 60);
  const mins = rem % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (days === 0 && mins > 0) parts.push(`${mins}m`);
  return parts.join(" ") || "1m";
}

/** Extract deterministic day-of-week, hour, minute, and display string in target timezone (EAT). */
export function getZonedClockParts(
  now: Date = new Date(),
  timeZone: string = ETHIOPIA_TIMEZONE
): {
  dayIndex: number;
  hour: number;
  minute: number;
  formattedLabel: string;
} {
  const tz = timeZone || ETHIOPIA_TIMEZONE;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const lookup: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== "literal") lookup[p.type] = p.value;
  }

  const dayIndex = WEEKDAY_MAP[lookup.weekday] ?? 0;
  const hour = Number(lookup.hour ?? 0) % 24;
  const minute = Number(lookup.minute ?? 0) % 60;
  const hh12 = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour >= 12 ? "PM" : "AM";

  const formattedLabel = `${DAY_NAMES[dayIndex]}, ${lookup.month} ${lookup.day} · ${hh12}:${String(
    minute
  ).padStart(2, "0")} ${ampm} EAT`;

  return { dayIndex, hour, minute, formattedLabel };
}

/** Evaluate whether the reporting window is open at `now` in Ethiopian Time (UTC+3). */
export function evaluateReportingWindow(
  rawConfig?: Partial<ReportingWindowConfig> | null,
  now: Date = new Date()
): ReportingWindowStatus {
  const config: ReportingWindowConfig = {
    window_mode: rawConfig?.window_mode || DEFAULT_WINDOW_CONFIG.window_mode,
    open_day:
      typeof rawConfig?.open_day === "number"
        ? rawConfig.open_day
        : DEFAULT_WINDOW_CONFIG.open_day,
    open_time: rawConfig?.open_time || DEFAULT_WINDOW_CONFIG.open_time,
    close_day:
      typeof rawConfig?.close_day === "number"
        ? rawConfig.close_day
        : DEFAULT_WINDOW_CONFIG.close_day,
    close_time: rawConfig?.close_time || DEFAULT_WINDOW_CONFIG.close_time,
    timezone: rawConfig?.timezone || ETHIOPIA_TIMEZONE,
  };

  const { dayIndex, hour, minute, formattedLabel } = getZonedClockParts(
    now,
    config.timezone
  );
  const nowTotal = dayIndex * MINUTES_PER_DAY + hour * 60 + minute;
  const openTotal = config.open_day * MINUTES_PER_DAY + parseTimeToMinutes(config.open_time);
  const closeTotal =
    config.close_day * MINUTES_PER_DAY + parseTimeToMinutes(config.close_time);

  const openLabel = formatDayTimeLabel(config.open_day, config.open_time);
  const closeLabel = formatDayTimeLabel(config.close_day, config.close_time);

  let scheduledOpen = false;
  if (openTotal === closeTotal) {
    scheduledOpen = true;
  } else if (openTotal < closeTotal) {
    scheduledOpen = nowTotal >= openTotal && nowTotal < closeTotal;
  } else {
    // Wraps across week boundary (e.g. Friday 06:00 -> Monday 04:00)
    scheduledOpen = nowTotal >= openTotal || nowTotal < closeTotal;
  }

  let isOpen = scheduledOpen;
  let reason: ReportingWindowStatus["reason"] = scheduledOpen
    ? "scheduled_open"
    : "scheduled_closed";

  if (config.window_mode === "force_open") {
    isOpen = true;
    reason = "force_open";
  } else if (config.window_mode === "force_closed") {
    isOpen = false;
    reason = "force_closed";
  }

  const minutesUntilChange =
    openTotal === closeTotal
      ? 0
      : isOpen
      ? (closeTotal - nowTotal + MINUTES_PER_WEEK) % MINUTES_PER_WEEK
      : (openTotal - nowTotal + MINUTES_PER_WEEK) % MINUTES_PER_WEEK;

  let countdownLabel = "";
  if (reason === "force_open") {
    countdownLabel = "Manually opened by Administrator override";
  } else if (reason === "force_closed") {
    countdownLabel = "Manually closed by Administrator override";
  } else if (openTotal === closeTotal) {
    countdownLabel = "Open continuously";
  } else if (isOpen) {
    countdownLabel = `Closes ${closeLabel} (in ${formatCountdown(minutesUntilChange)})`;
  } else {
    countdownLabel = `Opens ${openLabel} (in ${formatCountdown(minutesUntilChange)})`;
  }

  return {
    isOpen,
    mode: config.window_mode,
    reason,
    config,
    currentEthTimeLabel: formattedLabel,
    currentDayIndex: dayIndex,
    openLabel,
    closeLabel,
    countdownLabel,
    minutesUntilChange,
  };
}

