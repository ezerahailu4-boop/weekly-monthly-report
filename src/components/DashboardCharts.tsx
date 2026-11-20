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
  IconBuilding,
} from "@/components/Icons";

interface DashboardChartsProps {
  reports: ReportRow[];
}

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
  borderRadius: "8px",
  fontSize: "12px",
  color: "var(--foreground)",
  padding: "8px 12px",
} as React.CSSProperties;

export function DashboardCharts({ reports }: DashboardChartsProps) {
  const submitted = reports.filter((r) => r.status !== "draft");
  const draft = reports.filter((r) => r.status === "draft").length;
  const pendingReview = reports.filter((r) => r.status === "submitted").length;
  const reviewed = reports.filter((r) => r.status === "reviewed").length;

  // ── Submissions over last 8 weeks ──
  const weekMap: Record<string, { weekly: number; monthly: number }> = {};
  const now = new Date();
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(now.getUTCDate() - i * 7);
    const key = getWeekKey(d.toISOString().slice(0, 10));
    weekMap[key] = { weekly: 0, monthly: 0 };
  }
  for (const r of submitted) {
    const key = getWeekKey(r.created_at.slice(0, 10));
    if (weekMap[key]) {
      weekMap[key][r.report_type === "weekly" ? "weekly" : "monthly"] += 1;
    }
  }
  const weeklyData = Object.entries(weekMap).map(([week, v]) => ({ week, ...v }));

  // ── Status breakdown ──
  const statusData = [
    { name: "Reviewed", value: reviewed },
    { name: "Pending Review", value: pendingReview },
    { name: "Draft", value: draft },
  ].filter((d) => d.value > 0);

  // ── Monthly trend last 6 months ──
  const monthMap: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getUTCFullYear(), now.getUTCMonth() - i, 1);
    const key = `${SHORT_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    monthMap[key] = 0;
  }
  for (const r of submitted) {
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
      dept: dept.length > 22 ? dept.slice(0, 20) + "…" : dept,
      rate: v.total > 0 ? Math.round((v.submitted / v.total) * 100) : 0,
      total: v.total,
      submitted: v.submitted,
    }))
    .sort((a, b) => b.rate - a.rate);

  // ── Report type mix ──
  const weeklyCount = reports.filter((r) => r.report_type === "weekly").length;
  const monthlyCount = reports.filter((r) => r.report_type === "monthly").length;
  const typeMixData = [
    { name: "Weekly Reports", value: weeklyCount },
    { name: "Monthly Reports", value: monthlyCount },
  ].filter((d) => d.value > 0);

  return (
    <section aria-label="Reporting Statistics & Charts" className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
            Reporting Statistics
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Submissions, status breakdown, department compliance, and filing trends.
          </p>
        </div>
        <Badge variant="muted" size="sm">
          Live · Neon PostgreSQL
        </Badge>
      </div>

      {/* Row 1: Weekly submissions bar + Report type mix donut */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm font-bold text-foreground">Submissions — Last 8 Weeks</p>
            <Badge variant="outline" size="sm" className="text-xs">
              {submitted.length} total filed
            </Badge>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={weeklyData} barGap={4} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)", opacity: 0.2 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} verticalAlign="top" align="right" height={36} />
              <Bar dataKey="weekly" name="Weekly" fill="var(--brand)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="monthly" name="Monthly" fill="var(--accent)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-1 rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xs">
          <p className="text-sm font-bold text-foreground mb-4">Report Type Mix</p>
          {typeMixData.length === 0 ? (
            <div className="flex h-[220px] items-center justify-center text-xs text-muted-foreground">
              No data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={typeMixData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={88}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {typeMixData.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? "var(--brand)" : "var(--accent)"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} verticalAlign="top" align="center" height={36} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Row 2: Status breakdown donut + Monthly trend area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xs">
          <p className="text-sm font-bold text-foreground mb-4">Status Breakdown</p>
          {statusData.length === 0 ? (
            <div className="flex h-[240px] items-center justify-center text-xs text-muted-foreground">
              No data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={88}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusData.map((_, i) => {
                    const color =
                      i === 0 ? "var(--brand)" : i === 1 ? "var(--accent)" : "var(--muted)";
                    return <Cell key={i} fill={color} />;
                  })}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} verticalAlign="top" align="center" height={36} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm font-bold text-foreground">Monthly Submission Trend</p>
            <Badge variant="outline" size="sm" className="text-xs">
              Last 6 months
            </Badge>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={monthlyTrend} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
              <defs>
                <linearGradient id="color-brand" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--brand)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--brand)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)", opacity: 0.2 }} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="var(--brand)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#color-brand)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: Department compliance (horizontal bar) + Quick Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm font-bold text-foreground">Department Compliance Rate</p>
            <Badge variant="outline" size="sm" className="text-xs">
              Submitted ÷ Total reports
            </Badge>
          </div>
          {deptData.length === 0 ? (
            <div className="flex h-[260px] items-center justify-center text-xs text-muted-foreground">
              No departments yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={deptData} layout="vertical" margin={{ top: 10, right: 20, bottom: 10, left: 90 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis
                  type="category"
                  dataKey="dept"
                  tick={{ fontSize: 11, fill: "var(--foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  width={120}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => [`${value}%`, "Compliance"]}
                />
                <Bar
                  dataKey="rate"
                  name="Compliance %"
                  fill="var(--brand)"
                  radius={[0, 6, 6, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xs flex flex-col">
          <p className="text-sm font-bold text-foreground mb-4">Quick Insights</p>
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <IconTrendingUp size={16} />
                </span>
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    Reviews this period
                  </p>
                  <p className="text-[11px] font-medium text-muted-foreground tabular-nums">
                    {reviewed}
                  </p>
                </div>
              </div>
              <Badge variant="muted" size="sm">
                {reviewed > 0 ? "📈" : "–"}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <IconLayers size={16} />
                </span>
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    Pending review
                  </p>
                  <p className="text-[11px] font-medium text-muted-foreground tabular-nums">
                    {pendingReview}
                  </p>
                </div>
              </div>
              <Badge variant="outline" size="sm">
                {pendingReview > 0 ? "⏳" : "✅"}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <IconBarChart size={16} />
                </span>
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    Drafts open
                  </p>
                  <p className="text-[11px] font-medium text-muted-foreground tabular-nums">
                    {draft}
                  </p>
                </div>
              </div>
              <Badge variant="outline" size="sm">
                {draft > 0 ? "📝" : "–"}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
