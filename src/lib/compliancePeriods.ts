import type { ReportRow } from "@/types/report";

export interface WeekOption {
  key: string; // "YYYY-MM-DD_YYYY-MM-DD"
  start: string; // "YYYY-MM-DD" (Monday)
  end: string; // "YYYY-MM-DD" (Sunday)
  label: string;
}

export interface MonthOption {
  key: string; // "YYYY-MM"
  start: string; // "YYYY-MM-DD"
  end: string; // "YYYY-MM-DD"
  label: string;
}

const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const FULL_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function parseYmdUtc(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

function formatYmdUtc(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatShortDate(ymd: string): string {
  const dt = parseYmdUtc(ymd);
  return `${SHORT_MONTHS[dt.getUTCMonth()]} ${dt.getUTCDate()}`;
}

/** Return Monday..Sunday bounds covering `ymd`. */
export function getWeekBounds(ymd: string): { start: string; end: string } {
  const dt = parseYmdUtc(ymd);
  const dow = dt.getUTCDay(); // 0=Sun..6=Sat
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(dt);
  monday.setUTCDate(dt.getUTCDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return {
    start: formatYmdUtc(monday),
    end: formatYmdUtc(sunday),
  };
}

export function getMonthBounds(ym: string): { start: string; end: string } {
  const [yStr, mStr] = ym.split("-");
  const y = Number(yStr) || 2026;
  const m = Number(mStr) || 1;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return {
    start: `${y}-${String(m).padStart(2, "0")}-01`,
    end: `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function buildWeekOptions(
  todayEthYmd: string,
  reports: ReportRow[]
): WeekOption[] {
  const options: WeekOption[] = [];
  const seen = new Set<string>();
  const baseMonday = parseYmdUtc(getWeekBounds(todayEthYmd).start);

  const offsets = [
    { offset: 0, prefix: "Current Week" },
    { offset: -7, prefix: "Last Week" },
    { offset: -14, prefix: "2 Weeks Ago" },
    { offset: -21, prefix: "3 Weeks Ago" },
  ];

  for (const item of offsets) {
    const mon = new Date(baseMonday);
    mon.setUTCDate(baseMonday.getUTCDate() + item.offset);
    const sun = new Date(mon);
    sun.setUTCDate(mon.getUTCDate() + 6);
    const start = formatYmdUtc(mon);
    const end = formatYmdUtc(sun);
    const key = `${start}_${end}`;
    seen.add(key);
    options.push({
      key,
      start,
      end,
      label: `${item.prefix} (${formatShortDate(start)} – ${formatShortDate(end)})`,
    });
  }

  for (const r of reports) {
    if (r.report_type !== "weekly") continue;
    const { start, end } = getWeekBounds(r.period_end || r.period_start);
    const key = `${start}_${end}`;
    if (!seen.has(key)) {
      seen.add(key);
      options.push({
        key,
        start,
        end,
        label: `Week of ${formatShortDate(start)} – ${formatShortDate(end)}`,
      });
    }
  }

  return options;
}

export function buildMonthOptions(
  todayEthYmd: string,
  reports: ReportRow[]
): MonthOption[] {
  const options: MonthOption[] = [];
  const seen = new Set<string>();
  const [y0, m0] = todayEthYmd.split("-").map(Number);

  const offsets = [
    { delta: 0, prefix: "Current Month" },
    { delta: -1, prefix: "Last Month" },
    { delta: -2, prefix: "2 Months Ago" },
  ];

  for (const item of offsets) {
    const dt = new Date(Date.UTC(y0, (m0 || 1) - 1 + item.delta, 1));
    const ym = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(
      2,
      "0"
    )}`;
    const bounds = getMonthBounds(ym);
    const monthName = `${FULL_MONTHS[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
    seen.add(ym);
    options.push({
      key: ym,
      start: bounds.start,
      end: bounds.end,
      label: `${item.prefix} (${monthName})`,
    });
  }

  for (const r of reports) {
    if (r.report_type !== "monthly") continue;
    const ym = (r.period_end || r.period_start).slice(0, 7);
    if (ym.length === 7 && !seen.has(ym)) {
      seen.add(ym);
      const [ry, rm] = ym.split("-").map(Number);
      const bounds = getMonthBounds(ym);
      const monthName = `${FULL_MONTHS[(rm || 1) - 1]} ${ry}`;
      options.push({
        key: ym,
        start: bounds.start,
        end: bounds.end,
        label: monthName,
      });
    }
  }

  return options;
}

const STATUS_RANK: Record<string, number> = {
  reviewed: 3,
  submitted: 2,
  draft: 1,
};

/** Pick the highest-status matching report for a user in `[start, end]`. */
export function findBestReportInPeriod(
  reports: ReportRow[],
  userId: string,
  reportType: "weekly" | "monthly",
  periodStart: string,
  periodEnd: string
): ReportRow | null {
  const matches = reports.filter(
    (r) =>
      r.user_id === userId &&
      r.report_type === reportType &&
      r.period_start <= periodEnd &&
      r.period_end >= periodStart
  );
  if (matches.length === 0) return null;

  matches.sort((a, b) => {
    const rankDiff = (STATUS_RANK[b.status] || 0) - (STATUS_RANK[a.status] || 0);
    if (rankDiff !== 0) return rankDiff;
    return b.created_at.localeCompare(a.created_at);
  });

  return matches[0];
}

