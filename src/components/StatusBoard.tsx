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
  tasks: { id: string; title: string; description?: string; status: string; due_date?: string | null; completion_note?: string | null; assignee_name?: string | null }[];
  plans: { id: string; reference_code: string; title: string; department: string; status: string; summary?: string | null; objectives: { activity?: string; status?: string; progress?: number }[] }[];
}

export function StatusBoard({ reports, tasks, plans }: StatusBoardProps) {
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
  const openTasks = tasks.filter((task) => task.status !== "completed");
  const overdueTasks = openTasks.filter((task) => task.due_date && task.due_date < new Date().toISOString().slice(0, 10));
  const pendingPlans = plans.filter((plan) => plan.status === "submitted");
  const objectiveCount = plans.reduce((count, plan) => count + plan.objectives.length, 0);
  const completedObjectives = plans.flatMap((plan) => plan.objectives).filter((objective) => objective.status === "completed").length;

  return (
    <section aria-label="Executive Status Board" className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card px-5 py-5 shadow-sm sm:px-7">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-heading">Executive Status Board</h2>
          <p className="text-xs sm:text-sm text-body mt-0.5">Group performance across tasks, action plans, and weekly &amp; monthly filings.</p>
        </div>
        <Badge variant="muted" size="sm">Live · Neon PostgreSQL</Badge>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7 print:shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">Executive reporting</p><h3 className="mt-1 font-display text-xl font-extrabold text-foreground">Group performance brief</h3><p className="mt-1 text-sm text-muted-foreground">A live summary with a drill-down for every task, plan, and filing.</p></div>
          <button type="button" onClick={() => window.print()} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 print:hidden">Print / Save as PDF</button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[["Open tasks", openTasks.length, `${overdueTasks.length} overdue`], ["Plans awaiting review", pendingPlans.length, `${plans.length} action plans`], ["Weekly filings", submittedWeekly, `${reviewedWeekly} reviewed`], ["Monthly filings", submittedMonthly, `${reviewedMonthly} reviewed`]].map(([label, count, note]) => <div key={String(label)} className="rounded-xl border border-border bg-background p-4"><p className="text-xs font-semibold text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-extrabold tabular-nums text-foreground">{count}</p><p className="mt-1 text-xs text-muted-foreground">{note}</p></div>)}
        </div>
        <div className="mt-4 rounded-xl bg-muted/50 p-4"><p className="text-sm leading-6 text-muted-foreground">There are {openTasks.length} open tasks, including {overdueTasks.length} overdue. {pendingPlans.length} action plans await review. {objectiveCount ? Math.round(completedObjectives / objectiveCount * 100) : 0}% of plan objectives are marked complete. The board tracks {submittedWeekly} weekly and {submittedMonthly} monthly filings.</p></div>
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {[
            { title: "Tasks", items: tasks.map((item) => ({ id: item.id, name: item.title, meta: `${item.assignee_name || "Unassigned"} · ${item.status.replaceAll("_", " ")}${item.due_date ? ` · Due ${item.due_date}` : ""}`, summary: item.completion_note || item.description || "No task update added yet.", href: "/admin?tab=tasks" })) },
            { title: "Action plans", items: plans.map((item) => ({ id: item.id, name: item.title, meta: `${item.reference_code} · ${item.department} · ${item.status.replaceAll("_", " ")}`, summary: item.summary || `${item.objectives.length} objectives · ${item.objectives.filter((objective) => objective.status === "completed").length} complete.`, href: "/plans" })) },
            { title: "Weekly reports", items: reports.filter((item) => item.report_type === "weekly").map((item) => ({ id: item.id, name: `${item.author_name || "Staff"} · ${item.period_start}`, meta: `${item.author_department || "Division"} · ${item.status}`, summary: (item.data as { executiveSummary?: string } | null)?.executiveSummary || "No executive summary provided.", href: `/reports/${item.id}` })) },
            { title: "Monthly reports", items: reports.filter((item) => item.report_type === "monthly").map((item) => ({ id: item.id, name: `${item.author_name || "Staff"} · ${item.period_start.slice(0, 7)}`, meta: `${item.author_department || "Division"} · ${item.status}`, summary: (item.data as { executiveSummary?: string } | null)?.executiveSummary || "No executive summary provided.", href: `/reports/${item.id}` })) },
          ].map((group) => <div key={group.title} className="overflow-hidden rounded-xl border border-border bg-background"><div className="flex justify-between border-b border-border px-4 py-3"><h4 className="text-sm font-bold text-foreground">{group.title}</h4><span className="text-xs text-muted-foreground">{group.items.length}</span></div><div className="max-h-80 divide-y divide-border/70 overflow-y-auto">{group.items.length ? group.items.map((item) => <a key={item.id} href={item.href} className="block px-4 py-3 transition hover:bg-muted/40"><div className="flex flex-wrap justify-between gap-1"><p className="text-sm font-semibold text-foreground">{item.name}</p><span className="text-[11px] text-muted-foreground">{item.meta}</span></div><p className="mt-1.5 line-clamp-3 text-sm leading-5 text-muted-foreground">{item.summary}</p></a>) : <p className="px-4 py-6 text-center text-sm text-muted-foreground">No records yet.</p>}</div></div>)}
        </div>
      </section>

      {/* ── Top Metric Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl border border-border p-5 shadow-sm relative overflow-hidden group transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-300"><IconBarChart size={20} /></div>
          <p className="text-xs font-semibold uppercase tracking-wider text-body mb-1">Weekly Submitted</p>
          <p className="font-display text-3xl sm:text-4xl font-extrabold text-heading tabular-nums">
            {submittedWeekly}
          </p>
          <div className="mt-2 flex items-center gap-1 text-[11px] text-deep-emerald dark:text-[#36A879] font-medium">
            <span className="flex h-1 w-1 rounded-full bg-deep-emerald dark:bg-[#36A879]" />
            {reviewedWeekly} reviewed
          </div>
        </div>
        <div className="glass-card rounded-2xl border border-border p-5 shadow-sm relative overflow-hidden group transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-700 dark:text-violet-300"><IconFileText size={20} /></div>
          <p className="text-xs font-semibold uppercase tracking-wider text-body mb-1">Monthly Submitted</p>
          <p className="font-display text-3xl sm:text-4xl font-extrabold text-heading tabular-nums">
            {submittedMonthly}
          </p>
          <div className="mt-2 flex items-center gap-1 text-[11px] text-deep-emerald dark:text-[#36A879] font-medium">
            <span className="flex h-1 w-1 rounded-full bg-deep-emerald dark:bg-[#36A879]" />
            {reviewedMonthly} reviewed
          </div>
        </div>
        <div className="glass-card rounded-2xl border border-border p-5 shadow-sm relative overflow-hidden group transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300"><IconCompass size={20} /></div>
          <p className="text-xs font-semibold uppercase tracking-wider text-body mb-1">Drafts Open</p>
          <p className="font-display text-3xl sm:text-4xl font-extrabold text-destructive tabular-nums">
            {totalDraft}
          </p>
          <div className="mt-2 flex items-center gap-1 text-[11px] text-body font-medium">
            {draftWeekly} weekly · {draftMonthly} monthly
          </div>
        </div>
        <div className="glass-card rounded-2xl border border-border p-5 shadow-sm relative overflow-hidden group transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"><IconLayers size={20} /></div>
          <p className="text-xs font-semibold uppercase tracking-wider text-body mb-1">Resolution Rate</p>
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
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-300">
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
                    <stop offset="0%" stopColor="#4680FF" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#4680FF" stopOpacity={0.38} />
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
                    <stop offset="0%" stopColor="#13C2C2" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#13C2C2" stopOpacity={0.38} />
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
                    <stop offset="0%" stopColor="#4680FF" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#D6A64B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} hide />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted-foreground)", opacity: 0.2 }} />
                <Area type="monotone" dataKey="count" stroke="#4680FF" strokeWidth={3} fillOpacity={1} fill="url(#area-gold)" dot={{ fill: "#4680FF", stroke: "var(--card)", strokeWidth: 2 }} />
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
                  <Cell fill="#4680FF" />
                  <Cell fill="#E8EDF5" />
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
            <Bar dataKey="rate" name="Compliance %" fill="#4680FF" radius={[0, 8, 8, 0]} />
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
