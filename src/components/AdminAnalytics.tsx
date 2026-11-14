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
} from "recharts";
import type { ReportRow } from "@/types/report";

interface Props {
  reports: ReportRow[];
  staffList: { id: string; full_name: string; department: string; role: string }[];
}

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

const SHORT_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function AdminAnalytics({ reports, staffList }: Props) {
  const submitted = reports.filter((r) => r.status !== "draft");
  const employees = staffList.filter((s) => s.role === "employee");

  // ── 1. Submissions over last 8 weeks ──────────────────────────────────────
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
    const key = `${SHORT_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    monthMap[key] = 0;
  }
  for (const r of submitted) {
    const d = new Date(r.created_at);
    const key = `${SHORT_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    if (key in monthMap) monthMap[key] += 1;
  }
  const monthlyTrend = Object.entries(monthMap).map(([month, count]) => ({ month, count }));

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
          <p className="text-sm font-bold text-foreground mb-4">Submissions — Last 8 Weeks</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weeklyData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="weekly" name="Weekly" fill="var(--brand)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="monthly" name="Monthly" fill="var(--accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
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
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Row 2: Monthly trend + Department compliance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <p className="text-sm font-bold text-foreground mb-4">Monthly Submission Trend</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
              <Bar dataKey="count" name="Submissions" fill="var(--brand)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
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
