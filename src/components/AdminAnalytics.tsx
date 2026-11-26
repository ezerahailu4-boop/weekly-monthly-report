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

interface Props {
  reports: ReportRow[];
  tasks: TaskRow[];
  plans: { id: string; reference_code: string; title: string; department: string; status: string; period_start: string; period_end: string; summary: string | null; objectives: { activity?: string; status?: string; progress?: number }[] }[];
  staffList: { id: string; full_name: string; department: string; role: string }[];
}

function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  const dow = d.getUTCDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  const mon = new Date(d);
  mon.setUTCDate(d.getUTCDate() + diff);
  return mon.toISOString().slice(0, 10);
}

export function AdminAnalytics({ reports, staffList, tasks, plans }: Props) {
  const submitted = reports.filter((r) => r.status !== "draft");
  const openTasks = tasks.filter((t) => t.status !== "completed");
  const overdueTasks = openTasks.filter((t) => t.due_date && t.due_date < new Date().toISOString().slice(0, 10));
  const pendingPlans = plans.filter((p) => p.status === "submitted");
  const completedObjectives = plans.flatMap((p) => p.objectives).filter((o) => o.status === "completed").length;
  const totalObjectives = plans.reduce((sum, p) => sum + p.objectives.length, 0);
  const weekly = submitted.filter((r) => r.report_type === "weekly").length;
  const monthly = submitted.filter((r) => r.report_type === "monthly").length;
  const employees = staffList.filter((s) => s.role === "employee");

  // ── 1. Submissions over last 8 weeks ──────────────────────────────────────
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
    week: new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(`${weekStart}T00:00:00Z`)),
    ...v,
  }));
  const recentWeeklyTotal = weeklyData.reduce((sum, week) => sum + week.weekly, 0);

  // ── 2. Status breakdown (donut) ───────────────────────────────────────────
  const draft = reports.filter((r) => r.status === "draft").length;
  const pendingReview = reports.filter((r) => r.status === "submitted").length;
  const reviewed = reports.filter((r) => r.status === "reviewed").length;
  const statusData = [
    { name: "Reviewed", value: reviewed },
    { name: "Pending Review", value: pendingReview },
    { name: "Draft", value: draft },
  ].filter((d) => d.value > 0);
  const STATUS_COLORS = ["#3b82f6", "#f59e0b", "#6b7280"];

  // ── 3. Department compliance ──────────────────────────────────────────────
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

  // ── 4. Monthly submission trend (last 6 months) ───────────────────────────
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
    month: new Intl.DateTimeFormat("en", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(`${monthKey}-01T00:00:00Z`)),
    count,
  }));
  const recentMonthlyTotal = monthlyTrend.reduce((sum, month) => sum + month.count, 0);

  // ── 6. Task delivery trend — last 6 weeks ──
  const taskWeekMap: Record<string, { completed: number; overdue: number }> = {};
  const taskNow = new Date();
  const taskWeekStart = new Date(Date.UTC(taskNow.getUTCFullYear(), taskNow.getUTCMonth(), taskNow.getUTCDate()));
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
      const key = new Date(t.completed_at).toISOString().slice(0, 10);
      // bucket by task week (monday) of completion
      const weekKey = weekOf(new Date(key));
      if (taskWeekMap[weekKey]) taskWeekMap[weekKey].completed += 1;
    } else if (t.due_date && t.due_date < todayYmd && t.status !== "completed") {
      const key = new Date(t.due_date).toISOString().slice(0, 10);
      const weekKey = weekOf(new Date(key));
      if (taskWeekMap[weekKey]) taskWeekMap[weekKey].overdue += 1;
    }
  }
  const taskTrend = Object.entries(taskWeekMap).map(([weekStart, v]) => ({
    week: new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(`${weekStart}T00:00:00Z`)),
    ...v,
  }));

  // ── 7. Review turnaround ──
  const reviewCutoff = new Date();
  reviewCutoff.setUTCDate(reviewCutoff.getUTCDate() - 30);
  const reviewedReports = reports.filter((r) => r.status === "reviewed" && r.reviewed_at && new Date(r.reviewed_at) >= reviewCutoff);
  const turnaroundDays = reviewedReports.map((r) => {
    const start = new Date(r.created_at).getTime();
    const end = new Date(r.reviewed_at!).getTime();
    return Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
  });
  const avgTurnaround = turnaroundDays.length ? Math.round((turnaroundDays.reduce((a, b) => a + b, 0) / turnaroundDays.length) * 10) / 10 : 0;
  const onTimeSLA = reviewedReports.length
    ? Math.round((reviewedReports.filter((r, i) => turnaroundDays[i] <= 3).length / reviewedReports.length) * 100)
    : 0;

  function weekOf(date: Date): string {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const dow = d.getUTCDay();
    d.setUTCDate(d.getUTCDate() + (dow === 0 ? -6 : 1 - dow));
    return d.toISOString().slice(0, 10);
  }

  // ── 5. Top submitters ─────────────────────────────────────────────────────
  const submitterMap: Record<string, { name: string; count: number }> = {};
  for (const r of submitted) {
    if (!r.author_name) continue;
    if (!submitterMap[r.user_id]) submitterMap[r.user_id] = { name: r.author_name, count: 0 };
    submitterMap[r.user_id].count += 1;
  }
  const topSubmitters = Object.values(submitterMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const tooltipStyle = {
    backgroundColor: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    fontSize: "12px",
    color: "var(--foreground)",
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7 print:shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">Executive reporting</p><h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-foreground">Group performance brief</h2><p className="mt-1 text-sm text-muted-foreground">Live overview of task delivery, action plans, and performance submissions.</p></div>
          <button type="button" onClick={() => window.print()} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 print:hidden">Print / Save as PDF</button>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[["Open tasks", openTasks.length, `${overdueTasks.length} overdue`, "/admin?tab=tasks"], ["Plans awaiting review", pendingPlans.length, `${plans.length} plans total`, "/admin?tab=tasks"], ["Weekly reports", weekly, "Submitted or reviewed", "/admin?tab=reports"], ["Monthly reports", monthly, "Submitted or reviewed", "/admin?tab=reports"]].map(([label, value, caption, href]) => <a key={String(label)} href={String(href)} className="rounded-xl border border-border bg-background p-4 transition hover:border-accent/50 hover:shadow-sm"><p className="text-xs font-semibold text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-extrabold tabular-nums text-foreground">{value}</p><p className="mt-1 text-xs text-muted-foreground">{caption}</p></a>)}
        </div>
        <div className="mt-5 rounded-xl bg-muted/50 p-4 sm:p-5"><h3 className="text-sm font-bold text-foreground">Management summary</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">There are {openTasks.length} open tasks, including {overdueTasks.length} overdue. {pendingPlans.length} action plans await review. {totalObjectives ? Math.round((completedObjectives / totalObjectives) * 100) : 0}% of structured plan objectives are marked complete. The reporting register contains {weekly} weekly and {monthly} monthly submissions.</p><p className="mt-2 text-xs text-muted-foreground">Generated from current records · {new Date().toLocaleDateString()}</p></div>
      </section>
      <section className="space-y-4">
        <div><h2 className="font-display text-xl font-bold text-foreground">Record-by-record summaries</h2><p className="mt-1 text-sm text-muted-foreground">Review the latest task, plan, and reporting updates, with a direct link to each record.</p></div>
        <div className="grid gap-4 xl:grid-cols-2">
          {[
            { title: "Tasks", items: tasks.map((t) => ({ id: t.id, title: t.title, meta: `${t.assignee_name || "Unassigned"} · ${t.status.replaceAll("_", " ")} · ${t.due_date ? `Due ${t.due_date}` : "No due date"}`, summary: t.completion_note || t.description || "No task update has been added yet.", href: "/admin?tab=tasks" })) },
            { title: "Action plans", items: plans.map((p) => ({ id: p.id, title: p.title, meta: `${p.reference_code} · ${p.department} · ${p.status.replaceAll("_", " ")}`, summary: p.summary || `${p.objectives.length} objectives · ${p.objectives.filter((o) => o.status === "completed").length} marked complete.`, href: "/plans" })) },
            { title: "Weekly reports", items: reports.filter((r) => r.report_type === "weekly").map((r) => ({ id: r.id, title: `${r.author_name || "Staff"} · ${r.period_start}`, meta: `${r.author_department || "Division"} · ${r.status.replaceAll("_", " ")}`, summary: (r.data as { executiveSummary?: string } | null)?.executiveSummary || "No executive summary was provided.", href: `/reports/${r.id}` })) },
            { title: "Monthly reports", items: reports.filter((r) => r.report_type === "monthly").map((r) => ({ id: r.id, title: `${r.author_name || "Staff"} · ${r.period_start.slice(0, 7)}`, meta: `${r.author_department || "Division"} · ${r.status.replaceAll("_", " ")}`, summary: (r.data as { executiveSummary?: string } | null)?.executiveSummary || "No executive summary was provided.", href: `/reports/${r.id}` })) },
          ].map((group) => <div key={group.title} className="overflow-hidden rounded-2xl border border-border bg-card"><div className="flex items-center justify-between border-b border-border px-5 py-4"><h3 className="font-bold text-foreground">{group.title}</h3><span className="text-xs text-muted-foreground">{group.items.length} records</span></div><div className="max-h-[34rem] divide-y divide-border/70 overflow-y-auto">{group.items.length ? group.items.map((item) => <a href={item.href} key={item.id} className="block px-5 py-4 transition hover:bg-muted/40"><div className="flex flex-wrap items-baseline justify-between gap-2"><p className="text-sm font-semibold text-foreground">{item.title}</p><span className="text-[11px] text-muted-foreground">{item.meta}</span></div><p className="mt-2 line-clamp-3 text-sm leading-5 text-muted-foreground">{item.summary}</p></a>) : <p className="px-5 py-8 text-center text-sm text-muted-foreground">No records yet.</p>}</div></div>)}
        </div>
      </section>
      {/* Summary stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Submissions", value: submitted.length, color: "text-foreground" },
          { label: "Pending Review", value: pendingReview, color: "text-amber-600 dark:text-amber-300" },
          { label: "Reviewed", value: reviewed, color: "text-blue-600 dark:text-blue-300" },
          { label: "Active Staff", value: employees.length, color: "text-foreground" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
            <p className={`font-display text-3xl font-bold mt-2 tabular-nums ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Row 1: Weekly submissions + Status donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 shadow-xs">
          <p className="text-sm font-bold text-foreground mb-4">Weekly Filings — Last 8 Weeks</p>
          <p className="mb-4 text-xs text-muted-foreground">Weekly report filings counted by submission date; current week is in progress.</p>
          {recentWeeklyTotal === 0 ? (
            <div className="flex h-[220px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-5 text-center text-sm text-muted-foreground">No weekly reports have been submitted in this period.</div>
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
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <p className="text-sm font-bold text-foreground mb-4">Status Breakdown</p>
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
        </div>
      </div>

      {/* Row 2: Monthly trend + Department compliance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <p className="text-sm font-bold text-foreground mb-4">Monthly Filings — Last 6 Months</p>
          <p className="mb-4 text-xs text-muted-foreground">Monthly report filings grouped by submission month.</p>
          {recentMonthlyTotal === 0 ? (
            <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-5 text-center text-sm text-muted-foreground">No monthly reports have been submitted in this period.</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
                <Bar dataKey="count" name="Monthly reports" fill="var(--brand)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <p className="text-sm font-bold text-foreground mb-4">Department Compliance Rate</p>
          {deptData.length === 0 ? (
            <div className="flex h-[200px] items-center justify-center text-xs text-muted-foreground">No departments yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={deptData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="dept" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={110} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, "Compliance"]} />
                <Bar dataKey="rate" name="Compliance %" fill="var(--accent)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Row 3: Task delivery trend + Review turnaround */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-foreground">Task Delivery Trend — Last 6 Weeks</p>
              <p className="mb-1 text-xs text-muted-foreground">Completed vs. overdue tasks by week. Overdue = due date passed and still not completed.</p>
            </div>
            <Badge variant={recentWeeklyTotal ? "outline" : "muted"} size="sm">
              {taskTrend.reduce((s, w) => s + w.completed, 0)} completed this period
            </Badge>
          </div>
          {taskTrend.every((w) => w.completed === 0 && w.overdue === 0) ? (
            <div className="flex h-[210px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-5 text-center text-sm text-muted-foreground">No task activity in this period.</div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <LineChart data={taskTrend} margin={{ top: 8, right: 20, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="completed" name="Completed" stroke="var(--brand)" strokeWidth={3} dot={{ r: 4, stroke: "var(--brand)", strokeWidth: 2 }} />
                <Line type="monotone" dataKey="overdue" name="Overdue" stroke="var(--destructive)" strokeWidth={3} dot={{ r: 4, stroke: "var(--destructive)", strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-xs flex flex-col">
          <div className="mb-4">
            <p className="text-sm font-bold text-foreground">Review Turnaround</p>
            <p className="mb-1 text-xs text-muted-foreground">Avg days from submission to review (last 30 days) vs. 3‑day SLA, on‑time share.</p>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center relative">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie
                  data={[
                    { name: "On time", value: onTimeSLA },
                    { name: "Over SLA", value: Math.max(0, 100 - onTimeSLA) },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={95}
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
                <text x="50%" y="70%" textAnchor="middle" dominantBaseline="middle" fill="var(--muted-foreground)" fontSize="10">{onTimeSLA}% on time</text>
              </PieChart>
            </ResponsiveContainer>
            {reviewedReports.length === 0 && (
              <p className="mt-4 text-xs text-muted-foreground">No reviews in the last 30 days.</p>
            )}
          </div>
        </div>
      </div>

      {/* Top submitters leaderboard */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <p className="text-sm font-bold text-foreground mb-4">Top Submitters</p>
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
                    <div
                      className="h-full rounded-full bg-brand transition-all"
                      style={{ width: `${Math.round((s.count / (topSubmitters[0]?.count || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
