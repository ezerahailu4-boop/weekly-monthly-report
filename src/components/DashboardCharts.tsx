"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ReportRow } from "@/types/report";
import { Badge } from "@/components/ui";
import { IconBarChart, IconBuilding, IconLayers, IconTrendingUp } from "@/components/Icons";

interface DashboardChartsProps {
  reports: ReportRow[];
  employees: { id: string; department: string | null }[];
  asOfDate: string;
  weekPeriod: { start: string; end: string };
  monthPeriod: { start: string; end: string };
}

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const chartTooltipStyle: React.CSSProperties = {
  backgroundColor: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "12px",
  color: "var(--foreground)",
  fontSize: "12px",
  padding: "9px 12px",
  boxShadow: "0 12px 32px rgb(0 0 0 / 0.12)",
};
const chartLegendStyle: React.CSSProperties = {
  color: "var(--muted-foreground)",
  fontSize: "11px",
  paddingTop: "6px",
};

function parseYmd(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function weekStart(date: Date): Date {
  const monday = new Date(date);
  const day = monday.getUTCDay();
  monday.setUTCDate(monday.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return monday;
}

function ymd(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function weekLabel(date: Date): string {
  return `${SHORT_MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`;
}

function hasFiledReport(
  reports: ReportRow[],
  userId: string,
  type: "weekly" | "monthly",
  period: { start: string; end: string },
): boolean {
  return reports.some((report) =>
    report.user_id === userId &&
    report.report_type === type &&
    report.status !== "draft" &&
    report.period_start <= period.end &&
    report.period_end >= period.start
  );
}

export function DashboardCharts({ reports, employees, asOfDate, weekPeriod, monthPeriod }: DashboardChartsProps) {
  const filed = reports.filter((report) => report.status !== "draft");
  const drafts = reports.filter((report) => report.status === "draft").length;
  const awaitingReview = reports.filter((report) => report.status === "submitted").length;
  const reviewed = reports.filter((report) => report.status === "reviewed").length;

  const asOf = parseYmd(asOfDate);
  const weeklyBuckets = Array.from({ length: 8 }, (_, index) => {
    const monday = weekStart(asOf);
    monday.setUTCDate(monday.getUTCDate() - (7 - index) * 7);
    const start = ymd(monday);
    return { key: start, week: weekLabel(monday), weekly: 0, monthly: 0 };
  });
  const weeklyIndex = new Map(weeklyBuckets.map((bucket, index) => [bucket.key, index]));
  for (const report of filed) {
    const index = weeklyIndex.get(ymd(weekStart(parseYmd(report.created_at))));
    if (index !== undefined) weeklyBuckets[index][report.report_type === "weekly" ? "weekly" : "monthly"] += 1;
  }

  const statusData = [
    { name: "Reviewed", value: reviewed, color: "var(--brand)" },
    { name: "Awaiting review", value: awaitingReview, color: "var(--accent)" },
    { name: "Draft", value: drafts, color: "var(--muted-foreground)" },
  ].filter((item) => item.value > 0);
  const statusTotal = statusData.reduce((sum, item) => sum + item.value, 0);

  const monthBuckets = Array.from({ length: 6 }, (_, index) => {
    const month = new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth() - (5 - index), 1));
    return {
      key: `${month.getUTCFullYear()}-${String(month.getUTCMonth() + 1).padStart(2, "0")}`,
      month: `${SHORT_MONTHS[month.getUTCMonth()]} ${String(month.getUTCFullYear()).slice(-2)}`,
      count: 0,
    };
  });
  const monthIndex = new Map(monthBuckets.map((bucket, index) => [bucket.key, index]));
  for (const report of filed) {
    const date = parseYmd(report.created_at);
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    const index = monthIndex.get(key);
    if (index !== undefined) monthBuckets[index].count += 1;
  }

  const departmentMap = new Map<string, { expected: number; filed: number }>();
  for (const employee of employees) {
    const department = employee.department?.trim() || "Unassigned";
    const counts = departmentMap.get(department) || { expected: 0, filed: 0 };
    counts.expected += 2;
    if (hasFiledReport(reports, employee.id, "weekly", weekPeriod)) counts.filed += 1;
    if (hasFiledReport(reports, employee.id, "monthly", monthPeriod)) counts.filed += 1;
    departmentMap.set(department, counts);
  }
  const departmentData = [...departmentMap.entries()]
    .map(([department, counts]) => ({
      department,
      label: department.length > 20 ? `${department.slice(0, 18)}...` : department,
      ...counts,
      rate: counts.expected ? Math.round((counts.filed / counts.expected) * 100) : 0,
    }))
    .sort((a, b) => b.rate - a.rate || a.department.localeCompare(b.department));

  const weeklyCount = filed.filter((report) => report.report_type === "weekly").length;
  const monthlyCount = filed.filter((report) => report.report_type === "monthly").length;
  const typeData = [
    { name: "Weekly", value: weeklyCount, color: "var(--brand)" },
    { name: "Monthly", value: monthlyCount, color: "var(--accent)" },
  ].filter((item) => item.value > 0);

  const reviewCutoff = new Date(asOf);
  reviewCutoff.setUTCDate(reviewCutoff.getUTCDate() - 29);
  const recentReviews = reports.filter((report) => {
    if (report.status !== "reviewed" || !report.reviewed_at) return false;
    const date = parseYmd(report.reviewed_at);
    return date >= reviewCutoff && date <= asOf;
  }).length;

  return (
    <section aria-label="Reporting analytics" className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand">Executive analytics</p>
          <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Reporting overview</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">Filing volume, review status, department coverage, and recent trends.</p>
        </div>
        <Badge variant="muted" size="sm" className="w-fit">Data as of {asOfDate}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <article className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5 xl:col-span-8">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div><h3 className="text-sm font-bold text-foreground">Weekly filing volume</h3><p className="mt-0.5 text-[11px] text-muted-foreground">Weekly and monthly reports submitted in each week</p></div>
            <Badge variant="outline" size="sm">{filed.length} filed total</Badge>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={weeklyBuckets} barGap={5} margin={{ top: 8, right: 8, bottom: 4, left: -18 }}>
              <CartesianGrid strokeDasharray="3 5" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: "var(--muted)", opacity: 0.35 }} />
              <Legend wrapperStyle={chartLegendStyle} verticalAlign="top" align="right" height={30} />
              <Bar dataKey="weekly" name="Weekly" fill="var(--brand)" radius={[5, 5, 0, 0]} maxBarSize={28} />
              <Bar dataKey="monthly" name="Monthly" fill="var(--accent)" radius={[5, 5, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </article>

        <article className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5 xl:col-span-4">
          <div className="mb-2"><h3 className="text-sm font-bold text-foreground">Filed report mix</h3><p className="mt-0.5 text-[11px] text-muted-foreground">Share of submitted and reviewed reports</p></div>
          {typeData.length ? (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie data={typeData} cx="50%" cy="48%" innerRadius={58} outerRadius={83} paddingAngle={4} dataKey="value" stroke="none">
                  {typeData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} />
                <Legend wrapperStyle={chartLegendStyle} verticalAlign="bottom" align="center" />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart>No filed reports yet</EmptyChart>}
        </article>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
          <div className="mb-1"><h3 className="text-sm font-bold text-foreground">Review queue</h3><p className="mt-0.5 text-[11px] text-muted-foreground">Current status across all visible reports</p></div>
          {statusData.length ? (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="48%" innerRadius={62} outerRadius={87} paddingAngle={4} dataKey="value" stroke="none">
                  {statusData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} />
                <Legend wrapperStyle={chartLegendStyle} verticalAlign="bottom" align="center" />
                <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" fill="var(--foreground)" fontSize="22" fontWeight="700">{statusTotal}</text>
                <text x="50%" y="57%" textAnchor="middle" dominantBaseline="middle" fill="var(--muted-foreground)" fontSize="10">reports</text>
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart>No reports to show</EmptyChart>}
        </article>

        <article className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
          <div className="mb-2 flex items-start justify-between gap-3"><div><h3 className="text-sm font-bold text-foreground">Monthly filing trend</h3><p className="mt-0.5 text-[11px] text-muted-foreground">All filed report types by submission month</p></div><Badge variant="outline" size="sm">Last 6 months</Badge></div>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={monthBuckets} margin={{ top: 8, right: 8, bottom: 2, left: -18 }}>
              <defs><linearGradient id="filing-trend-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--brand)" stopOpacity={0.3} /><stop offset="95%" stopColor="var(--brand)" stopOpacity={0.015} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 5" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Area type="monotone" dataKey="count" name="Filed reports" stroke="var(--brand)" strokeWidth={2.5} activeDot={{ r: 5, strokeWidth: 0 }} fill="url(#filing-trend-fill)" />
            </AreaChart>
          </ResponsiveContainer>
        </article>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <article className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5 xl:col-span-8">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div className="flex items-start gap-2.5"><span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-brand/10 text-brand"><IconBuilding size={16} /></span><div><h3 className="text-sm font-bold text-foreground">Current-period submission coverage</h3><p className="mt-0.5 text-[11px] text-muted-foreground">Filed reports divided by expected weekly and monthly reports per employee</p></div></div>
            <Badge variant="outline" size="sm">{employees.length} employees</Badge>
          </div>
          {departmentData.length ? (
            <ResponsiveContainer width="100%" height={Math.max(220, Math.min(departmentData.length, 8) * 42)}>
              <BarChart data={departmentData.slice(0, 8)} layout="vertical" margin={{ top: 4, right: 20, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 5" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(value) => `${value}%`} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: "var(--foreground)" }} axisLine={false} tickLine={false} width={112} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(value, _name, item) => [`${value}% (${item.payload.filed}/${item.payload.expected} reports)`, "Coverage"]} labelFormatter={(_label, payload) => payload[0]?.payload.department || "Department"} />
                <Bar dataKey="rate" name="Coverage" fill="var(--brand)" radius={[0, 6, 6, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart>{employees.length ? "No department data available" : "Department coverage is available to management only"}</EmptyChart>}
          {departmentData.length > 8 && <p className="mt-1 text-center text-[10px] text-muted-foreground">Showing 8 of {departmentData.length} departments, sorted by coverage.</p>}
        </article>

        <article className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5 xl:col-span-4">
          <h3 className="text-sm font-bold text-foreground">At a glance</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Report workflow snapshot</p>
          <div className="mt-4 space-y-2.5">
            <Insight icon={<IconTrendingUp size={16} />} label="Reviews in last 30 days" value={recentReviews} tone="brand" />
            <Insight icon={<IconLayers size={16} />} label="Awaiting review" value={awaitingReview} tone="accent" />
            <Insight icon={<IconBarChart size={16} />} label="Open drafts" value={drafts} tone="muted" />
          </div>
          <p className="mt-4 border-t border-border pt-3 text-[10px] leading-relaxed text-muted-foreground">Coverage periods: week {weekPeriod.start} to {weekPeriod.end}; month {monthPeriod.start.slice(0, 7)}.</p>
        </article>
      </div>
    </section>
  );
}

function EmptyChart({ children }: { children: React.ReactNode }) {
  return <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-4 text-center text-xs text-muted-foreground">{children}</div>;
}

function Insight({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: "brand" | "accent" | "muted" }) {
  const styles = {
    brand: "bg-brand/10 text-brand",
    accent: "bg-accent/15 text-accent-foreground",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/20 p-3">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${styles[tone]}`}>{icon}</span>
      <span className="min-w-0 flex-1 text-xs font-semibold text-foreground">{label}</span>
      <span className="min-w-8 rounded-lg bg-card px-2 py-1 text-center font-mono text-xs font-bold tabular-nums text-foreground shadow-sm">{value}</span>
    </div>
  );
}
