"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import type { ReportRow } from "@/types/report";
import { Badge } from "@/components/ui";
import {
  IconTrendingUp,
  IconLayers,
  IconBarChart,
  IconCompass,
  IconFileText,
  IconTarget,
  IconBuilding,
} from "@/components/Icons";

const SHORT_MONTHS = [
  "Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec",
];

function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  const dow = d.getUTCDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  const mon = new Date(d);
  mon.setUTCDate(d.getUTCDate() + diff);
  const m = String(mon.getUTCMonth() + 1).padStart(2, "0");
  const day = String(mon.getUTCDate()).padStart(2, "0");
  return `${m}/${day}`;
}

const tooltipStyle = {
  backgroundColor: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "10px",
  fontSize: "12px",
  color: "var(--muted-foreground)",
  padding: "10px 14px",
  boxShadow: "0 8px 24px -4px rgba(0,0,0,0.08)",
} as React.CSSProperties;

function statPill(label: string, value: string | number, color = "text-gold") {
  return (
    <div className="flex items-center gap-2">
      <span className={`flex h-2.5 w-2.5 shrink-0 rounded-full ${color}`} />
      <span className="text-[11px] font-medium text-body tabular-nums">
        {label}
      </span>
      <span className="ml-1 text-xs font-bold tabular-nums text-heading">
        {value}
      </span>
    </div>
  );
}

export interface StatusBoardProps {
  reports: ReportRow[];
}

export function StatusBoard({ reports }: StatusBoardProps) {
  const now = new Date();

  // ── Separate weekly and monthly ──
  const weeklyReports = reports.filter((r) => r.report_type === "weekly");
  const monthlyReports = reports.filter((r) => r.report_type === "monthly");

  const submittedWeekly = weeklyReports.filter((r) => r.status !== "draft").length;
  const draftWeekly = weeklyReports.filter((r) => r.status === "draft").length;
  const reviewedWeekly = weeklyReports.filter((r) => r.status === "reviewed").length;

  const submittedMonthly = monthlyReports.filter((r) => r.status !== "draft").length;
  const draftMonthly = monthlyReports.filter((r) => r.status === "draft").length;
  const reviewedMonthly = monthlyReports.filter((r) => r.status === "reviewed").length;

  const totalSubmitted = submittedWeekly + submittedMonthly;
  const totalReviewed = reviewedWeekly + reviewedMonthly;
  const totalDraft = draftWeekly + draftMonthly;

  // ── Weekly trend last 8 weeks ──
  const weekMap: Record<string, { weekly: number; monthly: number }> = {};
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(now.getUTCDate() - i * 7);
    const key = getWeekKey(d.toISOString().slice(0, 10));
    weekMap[key] = { weekly: 0, monthly: 0 };
  }
  for (const r of reports.filter((r) => r.status !== "draft")) {
    const key = getWeekKey(r.created_at.slice(0, 10));
    if (weekMap[key]) {
      weekMap[key][r.report_type === "weekly" ? "weekly" : "monthly"] += 1;
    }
  }
  const weeklyData = Object.entries(weekMap).map(([week, v]) => ({ week, ...v }));

  // ── Monthly trend last 6 months ──
  const monthMap: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getUTCFullYear(), now.getUTCMonth() - i, 1);
    const key = `${SHORT_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    monthMap[key] = 0;
  }
  for (const r of reports.filter((r) => r.status !== "draft")) {
    const d = new Date(r.created_at);
    const key = `${SHORT_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    if (key in monthMap) monthMap[key] += 1;
  }
  const monthlyTrend = Object.entries(monthMap).map(([month, count]) => ({ month, count }));

  // ── Department compliance ──
  const deptMap: Record<string, { total: number; submitted: number }> = {};
  for (const r of reports) {
    const dept = r.profiles?.department || r.author_department || "Unassigned";
    if (!deptMap[dept]) deptMap[dept] = { total: 0, submitted: 0 };
    deptMap[dept].total += 1;
    if (r.status !== "draft") deptMap[dept].submitted += 1;
  }
  const deptData = Object.entries(deptMap)
    .map(([dept, v]) => ({
      dept: dept.length > 20 ? dept.slice(0, 18) + "…" : dept,
      rate: v.total > 0 ? Math.round((v.submitted / v.total) * 100) : 0,
    }))
    .sort((a, b) => b.rate - a.rate);

  const resolutionRate =
    totalSubmitted > 0 ? Math.round((totalReviewed / totalSubmitted) * 100) : 0;

  return (
    <section aria-label="Executive Status Board" className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-heading">
            Executive Status Board
          </h2>
          <p className="text-xs sm:text-sm text-body mt-0.5">
            Weekly & monthly filings — separated performance tracking.
          </p>
        </div>
        <Badge variant="muted" size="sm">Live · Neon PostgreSQL</Badge>
      </div>

      {/* ── Top Metric Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl border border-gold p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute right-4 top-4 opacity-30 group-hover:opacity-100 transition-opacity">
            <IconBarChart size={24} className="text-gold" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-body mb-1">
            Weekly Submitted
          </p>
          <p className="font-display text-3xl sm:text-4xl font-extrabold text-heading tabular-nums">
            {submittedWeekly}
          </p>
          <div className="mt-2 flex items-center gap-1 text-[11px] text-deep-emerald dark:text-[#36A879] font-medium">
            <span className="flex h-1 w-1 rounded-full bg-deep-emerald dark:bg-[#36A879]" />
            {reviewedWeekly} reviewed
          </div>
        </div>
        <div className="glass-card rounded-xl border border-gold p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute right-4 top-4 opacity-30 group-hover:opacity-100 transition-opacity">
            <IconFileText size={24} className="text-deep-emerald dark:text-[#36A879]" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-body mb-1">
            Monthly Submitted
          </p>
          <p className="font-display text-3xl sm:text-4xl font-extrabold text-heading tabular-nums">
            {submittedMonthly}
          </p>
          <div className="mt-2 flex items-center gap-1 text-[11px] text-deep-emerald dark:text-[#36A879] font-medium">
            <span className="flex h-1 w-1 rounded-full bg-deep-emerald dark:bg-[#36A879]" />
            {reviewedMonthly} reviewed
          </div>
        </div>
        <div className="glass-card rounded-xl border border-gold p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute right-4 top-4 opacity-30 group-hover:opacity-100 transition-opacity">
            <IconCompass size={24} className="text-body" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-body mb-1">
            Drafts Open
          </p>
          <p className="font-display text-3xl sm:text-4xl font-extrabold text-destructive tabular-nums">
            {totalDraft}
          </p>
          <div className="mt-2 flex items-center gap-1 text-[11px] text-body font-medium">
            {draftWeekly} weekly · {draftMonthly} monthly
          </div>
        </div>
        <div className="glass-card rounded-xl border border-gold p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute right-4 top-4 opacity-30 group-hover:opacity-100 transition-opacity">
            <IconLayers size={24} className="text-gold" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-body mb-1">
            Resolution Rate
          </p>
          <p className="font-display text-3xl sm:text-4xl font-extrabold text-heading tabular-nums">
            {resolutionRate}%
          </p>
          <div className="mt-2 flex items-center gap-1 text-[11px] text-body font-medium">
            {totalReviewed} of {totalSubmitted}
          </div>
        </div>
      </div>

      {/* ── Row 1: Weekly Bar + Monthly Bar (Separated) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Bar Chart */}
        <div className="chart-card p-5 flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold">
                <IconTrendingUp size={16} />
              </span>
              <div>
                <p className="chart-title">Weekly Submissions — Last 8 Weeks</p>
                <p className="text-[11px] text-body">{submittedWeekly} total filed</p>
              </div>
            </div>
            <Badge variant="muted" size="sm">Weekly</Badge>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={weeklyData} barGap={6} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                <defs>
                  <linearGradient id="weekly-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D6A64B" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#D6A64B" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} hide />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted-foreground)", opacity: 0.2 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} verticalAlign="top" align="left" />
                <Bar dataKey="weekly" name="Weekly" fill="url(#weekly-gradient)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Bar Chart */}
        <div className="chart-card p-5 flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-deep-emerald/10 text-deep-emerald">
                <IconTarget size={16} />
              </span>
              <div>
                <p className="chart-title">Monthly Submissions — Last 8 Weeks</p>
                <p className="text-[11px] text-body">{submittedMonthly} total filed</p>
              </div>
            </div>
            <Badge variant="muted" size="sm">Monthly</Badge>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={weeklyData} barGap={6} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                <defs>
                  <linearGradient id="monthly-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#006B45" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#006B45" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} hide />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted-foreground)", opacity: 0.2 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} verticalAlign="top" align="left" />
                <Bar dataKey="monthly" name="Monthly" fill="url(#monthly-gradient)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Row 2: Monthly Trend Area + Status Donut ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend Area */}
        <div className="chart-card p-5">
          <div className="flex items-center justify-between mb-5">
            <p className="chart-title">Monthly Submission Trend — Last 6 Months</p>
            <Badge variant="muted" size="sm">Trend</Badge>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthlyTrend} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                <defs>
                  <linearGradient id="area-gold" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D6A64B" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#D6A64B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} hide />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted-foreground)", opacity: 0.2 }} />
                <Area type="monotone" dataKey="count" stroke="#D6A64B" strokeWidth={3} fillOpacity={1} fill="url(#area-gold)" dot={{ fill: "#D6A64B", stroke: "var(--card)", strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Donut */}
        <div className="chart-card p-5 flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <p className="chart-title">Filing Status Ratio</p>
            <Badge variant="muted" size="sm">Draft vs Submitted</Badge>
          </div>
          <div className="flex-1 min-h-0 flex items-center justify-center">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={[
                    { name: "Submitted / Reviewed", value: totalSubmitted - totalDraft },
                    { name: "Draft", value: totalDraft },
                  ]}
                  cx="50%" cy="50%" innerRadius={70} outerRadius={95} paddingAngle={5} dataKey="value" startAngle={180} endAngle={360}
                >
                  <Cell fill="#006B45" />
                  <Cell fill="#D9CBA9" />
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} verticalAlign="bottom" align="center" height={60} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex items-center justify-between gap-4 px-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-deep-emerald" />
              <span className="text-xs font-medium text-heading">
                {totalSubmitted - totalDraft} Active Filings
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-champagne" />
              <span className="text-xs font-medium text-body">{totalDraft} Drafts</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 3: Department Compliance ── */}
      <div className="chart-card p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-champagne text-body">
              <IconBuilding size={16} />
            </span>
            <p className="chart-title">Department Compliance Rate</p>
          </div>
          <Badge variant="muted" size="sm">Submitted ÷ Total</Badge>
        </div>
        <div className="flex-1 min-h-0">
          {deptData.length === 0 ? (
            <div className="flex h-[200px] items-center justify-center text-xs text-body">
              No departments yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={deptData} layout="vertical" margin={{ top: 10, right: 20, bottom: 20, left: 120 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="dept" tick={{ fontSize: 11, fill: "var(--foreground)" }} axisLine={false} tickLine={false} width={130} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, "Compliance"]} />
                <Bar dataKey="rate" name="Compliance %" fill="#D6A64B" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Quick Stats Pills ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
        {statPill("Weekly Drafts", draftWeekly, "text-border")}

        {statPill("Monthly Drafts", draftMonthly, "text-border")}
        {statPill("Weekly Reviewed", reviewedWeekly, "text-deep-emerald")}
        {statPill("Monthly Reviewed", reviewedMonthly, "text-deep-emerald")}
      </div>
    </section>
  );
}
