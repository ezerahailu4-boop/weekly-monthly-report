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
  LineChart,
  Line,
} from "recharts";
import type { ReportRow } from "@/types/report";
import type { TaskRow } from "@/types/task";
import { Badge } from "@/components/ui";
import { IconAlertCircle, IconTrendingUp } from "@/components/Icons";

interface Props {
  reports: ReportRow[];
  tasks: TaskRow[];
  plans: {
    id: string;
    reference_code: string;
    title: string;
    department: string;
    status: string;
    period_start: string;
    period_end: string;
    summary: string | null;
    objectives: { activity?: string; status?: string; progress?: number }[];
  }[];
  staffList: { id: string; full_name: string; department: string; role: string }[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  const dow = d.getUTCDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  const mon = new Date(d);
  mon.setUTCDate(d.getUTCDate() + diff);
  return mon.toISOString().slice(0, 10);
}

function weekOf(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dow = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (dow === 0 ? -6 : 1 - dow));
  return d.toISOString().slice(0, 10);
}

/* ------------------------------------------------------------------ */
/*  Micro components                                                  */
/* ------------------------------------------------------------------ */

const tooltipStyle: React.CSSProperties = {
  backgroundColor: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  fontSize: "12px",
  color: "var(--foreground)",
};

function DeltaPill({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  const isUp = value > 0;
  const isDown = value < 0;
  if (!isUp && !isDown) return null;
  return (
    <Badge
      variant={isUp ? "success" : "destructive"}
      size="sm"
      className="flex items-center gap-1 text-[10px] font-semibold"
    >
      <IconTrendingUp
        size={12}
        className={`${
          isUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400 rotate-180"
        }`}
      />
      {Math.abs(value)}% {label}
    </Badge>
  );
}

function Sparkline({
  data,
  color = "var(--brand)",
  height = 30,
}: {
  data: { value: number }[];
  color?: string;
  height?: number;
}) {
  if (!data || data.length < 2) return null;
  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = 100 / (data.length - 1);
  const points = data
    .map((d, i) => {
      const y = 100 - ((d.value - min) / range) * 100;
      return `${i * step},${y}`;
    })
    .join(" ");
  return (
    <svg width="100%" height={height} viewBox="0 0 100 100" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MetricCard({
  title,
  value,
  caption,
  delta,
  sparkData,
  color = "var(--brand)",
}: {
  title: string;
  value: React.ReactNode;
  caption?: string;
  delta?: React.ReactNode;
  sparkData?: { value: number }[];
  color?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand shadow-sm">
            <span className="text-[10px]">{title.slice(0, 1).toUpperCase()}</span>
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
            <p className="mt-1 font-display text-3xl font-bold tracking-tight tabular-nums text-foreground">
              {value}
            </p>
            {caption && <p className="mt-0.5 text-[11px] text-muted-foreground">{caption}</p>}
          </div>
        </div>
        <div className="flex items-end gap-2">
          {delta && <span className="self-start">{delta}</span>}
          {sparkData ? (
            <div className="w-24 h-8 md:w-32 md:h-10 flex items-end gap-1">
              <Sparkline data={sparkData} color={color} height={40} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-sm">
      <p className="text-sm font-bold text-foreground mb-3">{title}</p>
      {caption && <p className="mb-4 text-xs text-muted-foreground">{caption}</p>}
      <div className="relative">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Dashboard                                                         */
/* ------------------------------------------------------------------ */

export function AdminAnalytics({ reports, staffList, tasks, plans }: Props) {
  const submitted = reports.filter((r) => r.status !== "draft");
  const openTasks = tasks.filter((t) => t.status !== "completed");
  const overdueTasks = openTasks.filter(
    (t) => t.due_date && t.due_date < new Date().toISOString().slice(0, 10)
  );
  const pendingPlans = plans.filter((p) => p.status === "submitted");
  const completedObjectives = plans.flatMap((p) => p.objectives).filter((o) => o.status === "completed").length;
  const totalObjectives = plans.reduce((sum, p) => sum + p.objectives.length, 0);
  const weekly = submitted.filter((r) => r.report_type === "weekly").length;
  const monthly = submitted.filter((r) => r.report_type === "monthly").length;
  const employees = staffList.filter((s) => s.role === "employee");

  // ── Submissions over last 8 weeks ──
  const weekMap: Record<string, { weekly: number }> = {};
  const now = new Date();
  const currentWeekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const currentDow = currentWeekStart.getUTCDay();
  currentWeekStart.setUTCDate(currentWeekStart.getUTCDate() + (currentDow === 0 ? -6 : 1 - currentDow));
  for (let i = 7; i >= 0; i--) {
    const d = new Date(currentWeekStart);
    d.setUTCDate(currentWeekStart.getUTCDate() - i * 7);
    const key = d.toISOString().slice(0, 10);
    weekMap[key] = { weekly: 0 };
  }
  for (const r of submitted) {
    if (r.report_type !== "weekly") continue;
    const key = getWeekKey(r.created_at.slice(0, 10));
    if (weekMap[key]) weekMap[key].weekly += 1;
  }
  const weeklyData = Object.entries(weekMap).map(([weekStart, v]) => ({
    week: new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(
      new Date(`${weekStart}T00:00:00Z`)
    ),
    ...v,
  }));
  const recentWeeklyTotal = weeklyData.reduce((sum, week) => sum + week.weekly, 0);
  const weeklyPrev = weeklyData.length >= 2 ? weeklyData[weeklyData.length - 2].weekly : 0;
  const weeklyDelta =
    weeklyData.length >= 2 ? weeklyData[weeklyData.length - 1].weekly - weeklyPrev : 0;
  const weeklyDeltaPct =
    weeklyData.length >= 2 && weeklyPrev > 0 ? Math.round((weeklyDelta / weeklyPrev) * 100) : 0;

  // ── Status breakdown (donut) ──
  const draft = reports.filter((r) => r.status === "draft").length;
  const pendingReview = reports.filter((r) => r.status === "submitted").length;
  const reviewed = reports.filter((r) => r.status === "reviewed").length;
  const statusData = [
    { name: "Reviewed", value: reviewed },
    { name: "Pending Review", value: pendingReview },
    { name: "Draft", value: draft },
  ].filter((d) => d.value > 0);
  const STATUS_COLORS = ["var(--brand)", "var(--accent)", "var(--muted-foreground)"];

  // ── Department compliance ──
  const deptMap: Record<string, { total: number; submitted: number }> = {};
  for (const s of employees) {
    const dept = s.department || "Unknown";
    if (!deptMap[dept]) deptMap[dept] = { total: 0, submitted: 0 };
    deptMap[dept].total += 1;
    const hasSubmitted = submitted.some((r) => r.user_id === s.id);
    if (hasSubmitted) deptMap[dept].submitted += 1;
  }
  const deptData = Object.entries(deptMap)
    .map(([dept, v]) => ({
      dept: dept.length > 20 ? dept.slice(0, 18) + "…" : dept,
      rate: v.total > 0 ? Math.round((v.submitted / v.total) * 100) : 0,
    }))
    .sort((a, b) => b.rate - a.rate);

  // ── Monthly submission trend ──
  const monthMap: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getUTCFullYear(), now.getUTCMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap[key] = 0;
  }
  for (const r of submitted) {
    if (r.report_type !== "monthly") continue;
    const d = new Date(r.created_at);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    if (key in monthMap) monthMap[key] += 1;
  }
  const monthlyTrend = Object.entries(monthMap).map(([monthKey, count]) => ({
    month: new Intl.DateTimeFormat("en", { month: "short", year: "2-digit", timeZone: "UTC" }).format(
      new Date(`${monthKey}-01T00:00:00Z`)
    ),
    count,
  }));
  const recentMonthlyTotal = monthlyTrend.reduce((sum, month) => sum + month.count, 0);

  // ── Task delivery trend ──
  const taskWeekMap: Record<string, { completed: number; overdue: number }> = {};
  const taskWeekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const taskDow = taskWeekStart.getUTCDay();
  taskWeekStart.setUTCDate(taskWeekStart.getUTCDate() + (taskDow === 0 ? -6 : 1 - taskDow));
  for (let i = 5; i >= 0; i--) {
    const d = new Date(taskWeekStart);
    d.setUTCDate(taskWeekStart.getUTCDate() - i * 7);
    const key = d.toISOString().slice(0, 10);
    taskWeekMap[key] = { completed: 0, overdue: 0 };
  }
  const todayYmd = new Date().toISOString().slice(0, 10);
  for (const t of tasks) {
    if (t.status === "completed" && t.completed_at) {
      const weekKey = weekOf(new Date(t.completed_at));
      if (taskWeekMap[weekKey]) taskWeekMap[weekKey].completed += 1;
    } else if (t.due_date && t.due_date < todayYmd && t.status !== "completed") {
      const weekKey = weekOf(new Date(t.due_date));
      if (taskWeekMap[weekKey]) taskWeekMap[weekKey].overdue += 1;
    }
  }
  const taskTrend = Object.entries(taskWeekMap).map(([weekStart, v]) => ({
    week: new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(
      new Date(`${weekStart}T00:00:00Z`)
    ),
    ...v,
  }));

  // ── Review turnaround ──
  const reviewCutoff = new Date();
  reviewCutoff.setUTCDate(reviewCutoff.getUTCDate() - 30);
  const reviewedReports = reports.filter(
    (r) => r.status === "reviewed" && r.reviewed_at && new Date(r.reviewed_at) >= reviewCutoff
  );
  const turnaroundDays = reviewedReports.map((r) => {
    const start = new Date(r.created_at).getTime();
    const end = new Date(r.reviewed_at!).getTime();
    return Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
  });
  const avgTurnaround = turnaroundDays.length
    ? Math.round((turnaroundDays.reduce((a, b) => a + b, 0) / turnaroundDays.length) * 10) / 10
    : 0;
  const onTimeSLA = reviewedReports.length
    ? Math.round((reviewedReports.filter((r, i) => turnaroundDays[i] <= 3).length / reviewedReports.length) * 100)
    : 0;

  // ── Top submitters ──
  const submitterMap: Record<string, { name: string; count: number }> = {};
  for (const r of submitted) {
    if (!r.author_name) continue;
    if (!submitterMap[r.user_id]) submitterMap[r.user_id] = { name: r.author_name, count: 0 };
    submitterMap[r.user_id].count += 1;
  }
  const topSubmitters = Object.values(submitterMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-sm print:shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">Executive reporting</p>
            <h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-foreground">Governance overview</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Live overview of task delivery, action plans, and performance submissions.
            </p>
          </div>
          <button type="button" onClick={() => window.print()} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 print:hidden">
            Print / Save as PDF
          </button>
        </div>
      </section>

      {/* Signals / needs attention */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          title="Overdue tasks"
          value={overdueTasks.length}
          delta={
            overdueTasks.length > 0 ? (
              <Badge variant="destructive" size="sm" className="text-[10px]">
                <IconAlertCircle size={12} className="mr-1" /> Needs action
              </Badge>
            ) : (
              <Badge variant="success" size="sm" className="text-[10px]">All clear</Badge>
            )
          }
        />
        <MetricCard
          title="Plans awaiting review"
          value={pendingPlans.length}
          delta={<Badge variant="warning" size="sm" className="text-[10px]">{plans.length} plans total</Badge>}
        />
        <MetricCard
          title="Draft reports"
          value={draft}
          delta={<Badge variant="muted" size="sm" className="text-[10px]">{submitted.length} submitted</Badge>}
        />
        <MetricCard
          title="Active warnings"
          value={plans.filter((p) => p.status === "submitted").length}
          delta={<Badge variant="muted" size="sm" className="text-[10px]">Compliance register</Badge>}
        />
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard
          title="Total submissions"
          value={submitted.length}
          caption="Weekly + monthly filings"
          sparkData={weeklyData.map((w) => ({ value: w.weekly }))}
          color="var(--brand)"
        />
        <MetricCard
          title="Pending review"
          value={pendingReview}
          delta={
            weeklyDeltaPct !== 0 ? <DeltaPill value={weeklyDeltaPct} label="weekly vs last week" /> : null
          }
        />
        <MetricCard
          title="Reviewed"
          value={reviewed}
          delta={
            reviewedReports.length > 0 ? (
              <Badge variant="success" size="sm" className="text-[10px]">{avgTurnaround} avg days</Badge>
            ) : null
          }
        />
        <MetricCard
          title="Active staff"
          value={employees.length}
          caption={`${employees.length} employees`}
        />
      </div>

      {/* Row 1: Weekly + Monthly + Task delivery */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard title="Weekly filings — last 8 weeks" caption="Weekly report filings by submission week.">
          {recentWeeklyTotal === 0 ? (
            <div className="flex h-[220px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-5 text-center text-sm text-muted-foreground">
              No weekly reports in this period.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weeklyData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
                <Bar dataKey="weekly" name="Weekly reports" fill="var(--brand)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Monthly filings — last 6 months" caption="Monthly report filings grouped by submission month.">
          {recentMonthlyTotal === 0 ? (
            <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-5 text-center text-sm text-muted-foreground">
              No monthly reports in this period.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
                <Bar dataKey="count" name="Monthly reports" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Task delivery — last 6 weeks" caption="Completed vs overdue tasks by week.">
          {taskTrend.every((w) => w.completed === 0 && w.overdue === 0) ? (
            <div className="flex h-[210px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-5 text-center text-sm text-muted-foreground">
              No task activity in this period.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <LineChart data={taskTrend} margin={{ top: 8, right: 20, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="completed" name="Completed" stroke="var(--brand)" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="overdue" name="Overdue" stroke="var(--destructive)" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Row 2: Status, turnaround, department */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard title="Status breakdown" caption="Current share of all reports by review status.">
          {statusData.length === 0 ? (
            <div className="flex h-[220px] items-center justify-center text-xs text-muted-foreground">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Review turnaround" caption="Avg days from submission to review vs 3-day SLA (last 30 days).">
          <div className="flex-1 flex flex-col items-center justify-center relative">
            <ResponsiveContainer width={170} height={170}>
              <PieChart>
                <Pie
                  data={[
                    { name: "On time", value: onTimeSLA },
                    { name: "Over SLA", value: Math.max(0, 100 - onTimeSLA) },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={72}
                  outerRadius={96}
                  paddingAngle={5}
                  dataKey="value"
                  startAngle={180}
                  endAngle={360}
                >
                  <Cell key="on-time" fill="var(--brand)" />
                  <Cell key="over-sla" fill="var(--muted)" />
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" fill="var(--foreground)" fontSize="22" fontWeight="800" fontFamily="var(--font-mono)">
                  {avgTurnaround}
                </text>
                <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle" fill="var(--muted-foreground)" fontSize="10">avg days to review</text>
                <text x="50%" y="70%" textAnchor="middle" dominantBaseline="middle" fill="var(--muted-foreground)" fontSize="10">{onTimeSLA}% on SLA</text>
              </PieChart>
            </ResponsiveContainer>
            {reviewedReports.length === 0 && (
              <p className="mt-4 text-xs text-muted-foreground">No reviews in the last 30 days.</p>
            )}
          </div>
        </ChartCard>

        <ChartCard title="Department compliance" caption="Submission rate per department, sorted by coverage.">
          {deptData.length === 0 ? (
            <div className="flex h-[200px] items-center justify-center text-xs text-muted-foreground">No departments yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(220, Math.min(deptData.length, 8) * 42)}>
              <BarChart data={deptData.slice(0, 8)} layout="vertical" margin={{ top: 4, right: 20, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="dept" tick={{ fontSize: 11, fill: "var(--foreground)" }} axisLine={false} tickLine={false} width={110} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, "Compliance"]} />
                <Bar dataKey="rate" name="Compliance %" fill="var(--brand)" radius={[0, 6, 6, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          )}
          {deptData.length > 8 && <p className="mt-1 text-center text-[10px] text-muted-foreground">Showing 8 of {deptData.length} departments.</p>}
        </ChartCard>
      </div>

      {/* Top submitters leaderboard */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-foreground">Top submitters</p>
          <p className="text-xs text-muted-foreground">{topSubmitters.length} active this period</p>
        </div>
        {topSubmitters.length === 0 ? (
          <p className="text-xs text-muted-foreground">No submissions yet.</p>
        ) : (
          <div className="space-y-2">
            {topSubmitters.map((s, i) => (
              <div key={s.name} className="flex items-center gap-3">
                <span className="w-5 text-xs font-bold text-muted-foreground tabular-nums text-right">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-foreground truncate">{s.name}</span>
                    <span className="text-xs font-bold tabular-nums text-foreground ml-2">{s.count}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${Math.round((s.count / (topSubmitters[0]?.count || 1)) * 100)}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Management summary */}
      <div className="mt-6 rounded-xl bg-muted/50 p-4 sm:p-5">
        <h3 className="text-sm font-bold text-foreground">Management summary</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          There are {openTasks.length} open tasks, including {overdueTasks.length} overdue. {pendingPlans.length} action plans await review.
          {totalObjectives ? Math.round((completedObjectives / totalObjectives) * 100) : 0}% of structured plan objectives are marked complete.
          The reporting register contains {weekly} weekly and {monthly} monthly submissions.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">Generated from current records · {new Date().toLocaleDateString()}</p>
      </div>

      {/* Record-by-record summaries */}
      <section className="space-y-4">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">Record-by-record summaries</h2>
          <p className="mt-1 text-sm text-muted-foreground">Review the latest task, plan, and reporting updates, with a direct link to each record.</p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {[
            {
              title: "Tasks",
              items: tasks.map((t) => ({
                id: t.id,
                title: t.title,
                meta: `${t.assignee_name || "Unassigned"} · ${t.status.replaceAll("_", " ")} · ${t.due_date ? `Due ${t.due_date}` : "No due date"}`,
                summary: t.completion_note || t.description || "No task update has been added yet.",
                href: "/admin?tab=tasks",
              })),
            },
            {
              title: "Action plans",
              items: plans.map((p) => ({
                id: p.id,
                title: p.title,
                meta: `${p.reference_code} · ${p.department} · ${p.status.replaceAll("_", " ")}`,
                summary: p.summary || `${p.objectives.length} objectives · ${p.objectives.filter((o) => o.status === "completed").length} marked complete.`,
                href: "/plans",
              })),
            },
            {
              title: "Weekly reports",
              items: reports.filter((r) => r.report_type === "weekly").map((r) => ({
                id: r.id,
                title: `${r.author_name || "Staff"} · ${r.period_start}`,
                meta: `${r.author_department || "Division"} · ${r.status.replaceAll("_", " ")}`,
                summary: (r.data as { executiveSummary?: string } | null)?.executiveSummary || "No executive summary was provided.",
                href: `/reports/${r.id}`,
              })),
            },
            {
              title: "Monthly reports",
              items: reports.filter((r) => r.report_type === "monthly").map((r) => ({
                id: r.id,
                title: `${r.author_name || "Staff"} · ${r.period_start.slice(0, 7)}`,
                meta: `${r.author_department || "Division"} · ${r.status.replaceAll("_", " ")}`,
                summary: (r.data as { executiveSummary?: string } | null)?.executiveSummary || "No executive summary was provided.",
                href: `/reports/${r.id}`,
              })),
            },
          ].map((group) => (
            <div key={group.title} className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h3 className="font-bold text-foreground">{group.title}</h3>
                <span className="text-xs text-muted-foreground">{group.items.length} records</span>
              </div>
              <div className="max-h-[34rem] divide-y divide-border/70 overflow-y-auto">
                {group.items.length ? (
                  group.items.map((item) => (
                    <a href={item.href} key={item.id} className="block px-5 py-4 transition hover:bg-muted/40">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">{item.title}</p>
                        <span className="text-[11px] text-muted-foreground">{item.meta}</span>
                      </div>
                      <p className="mt-2 line-clamp-3 text-sm leading-5 text-muted-foreground">{item.summary}</p>
                    </a>
                  ))
                ) : (
                  <p className="px-5 py-8 text-center text-sm text-muted-foreground">No records yet.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
