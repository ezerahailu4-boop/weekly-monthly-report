"use client";

import { useState } from "react";
import Link from "next/link";
import {
  buildMonthOptions,
  buildWeekOptions,
  findBestReportInPeriod,
} from "@/lib/compliancePeriods";
import { StatusBadge } from "./StatusBadge";
import {
  IconBuilding,
  IconCheckCircle,
  IconCheckSquare,
  IconEye,
  IconSearch,
  IconSend,
  IconUser,
  IconX,
} from "./Icons";
import type { ReportRow } from "@/types/report";

export interface TrackedStaffMember {
  id: string;
  full_name: string | null;
  email: string;
  department: string | null;
  role: "employee" | "admin" | "super_admin";
  telegram_chat_id?: string | null;
}

export interface StaffTaskCounts {
  pending: number;
  completed: number;
}

type ComplianceFilter =
  | "all"
  | "missing_weekly"
  | "missing_monthly"
  | "missing_any"
  | "compliant";

export function StaffSubmissionTracker({
  staffList,
  reports,
  taskStats = {},
  todayEthYmd,
  telegramBotConfigured = false,
}: {
  staffList: TrackedStaffMember[];
  reports: ReportRow[];
  taskStats?: Record<string, StaffTaskCounts>;
  todayEthYmd: string;
  telegramBotConfigured?: boolean;
}) {
  const weekOptions = buildWeekOptions(todayEthYmd, reports);
  const monthOptions = buildMonthOptions(todayEthYmd, reports);

  const [selectedWeekKey, setSelectedWeekKey] = useState(
    weekOptions[0]?.key || ""
  );
  const [selectedMonthKey, setSelectedMonthKey] = useState(
    monthOptions[0]?.key || ""
  );
  const [roleScope, setRoleScope] = useState<"staff" | "all">("staff");
  const [complianceFilter, setComplianceFilter] =
    useState<ComplianceFilter>("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [remindingKey, setRemindingKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  const activeWeek =
    weekOptions.find((w) => w.key === selectedWeekKey) || weekOptions[0];
  const activeMonth =
    monthOptions.find((m) => m.key === selectedMonthKey) || monthOptions[0];

  const scopedMembers =
    roleScope === "staff"
      ? staffList.filter((m) => m.role === "employee")
      : staffList;

  const departments = Array.from(
    new Set(scopedMembers.map((m) => m.department).filter(Boolean) as string[])
  );

  const evaluated = scopedMembers.map((member) => {
    const weeklyReport = activeWeek
      ? findBestReportInPeriod(
          reports,
          member.id,
          "weekly",
          activeWeek.start,
          activeWeek.end
        )
      : null;
    const monthlyReport = activeMonth
      ? findBestReportInPeriod(
          reports,
          member.id,
          "monthly",
          activeMonth.start,
          activeMonth.end
        )
      : null;

    const weeklySubmitted =
      weeklyReport?.status === "submitted" ||
      weeklyReport?.status === "reviewed";
    const monthlySubmitted =
      monthlyReport?.status === "submitted" ||
      monthlyReport?.status === "reviewed";

    return {
      member,
      weeklyReport,
      monthlyReport,
      weeklySubmitted,
      monthlySubmitted,
      tasks: taskStats[member.id] || { pending: 0, completed: 0 },
    };
  });

  const totalMembers = evaluated.length;
  const weeklySubmittedCount = evaluated.filter((e) => e.weeklySubmitted).length;
  const monthlySubmittedCount = evaluated.filter(
    (e) => e.monthlySubmitted
  ).length;

  const weeklyPercent =
    totalMembers > 0
      ? Math.round((weeklySubmittedCount / totalMembers) * 100)
      : 0;
  const monthlyPercent =
    totalMembers > 0
      ? Math.round((monthlySubmittedCount / totalMembers) * 100)
      : 0;

  const filtered = evaluated.filter((item) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      (item.member.full_name || "").toLowerCase().includes(q) ||
      item.member.email.toLowerCase().includes(q) ||
      (item.member.department || "").toLowerCase().includes(q);

    const matchesDept =
      departmentFilter === "all" ||
      item.member.department === departmentFilter;

    let matchesCompliance = true;
    if (complianceFilter === "missing_weekly") {
      matchesCompliance = !item.weeklySubmitted;
    } else if (complianceFilter === "missing_monthly") {
      matchesCompliance = !item.monthlySubmitted;
    } else if (complianceFilter === "missing_any") {
      matchesCompliance = !item.weeklySubmitted || !item.monthlySubmitted;
    } else if (complianceFilter === "compliant") {
      matchesCompliance = item.weeklySubmitted && item.monthlySubmitted;
    }

    return matchesSearch && matchesDept && matchesCompliance;
  });

  async function handleRemind(
    userId: string,
    reportType: "weekly" | "monthly",
    periodLabel: string
  ) {
    const key = `${userId}_${reportType}`;
    setRemindingKey(key);
    setNotice(null);
    try {
      const res = await fetch("/api/reports/remind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, reportType, periodLabel }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setNotice({
          type: "err",
          text: data.error || "Could not send reminder.",
        });
      } else {
        setNotice({
          type: "ok",
          text: data.message || "Telegram reminder sent!",
        });
      }
    } catch (err: unknown) {
      setNotice({
        type: "err",
        text: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      setRemindingKey(null);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-start gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <IconCheckCircle size={18} />
          </div>
          <div>
            <h3 className="font-display text-sm sm:text-base font-bold text-foreground">
              Registered Staff Weekly &amp; Monthly Submission Tracker
            </h3>
            <p className="text-[11px] sm:text-xs text-muted-foreground">
              Compare every registered user side-by-side to see who submitted or missed their Weekly and Monthly reports.
            </p>
          </div>
        </div>

        {/* Role Scope Switch */}
        <div className="inline-flex h-9 items-center rounded-lg bg-muted p-1 text-muted-foreground text-xs border border-border/60 w-fit shrink-0">
          <button
            type="button"
            onClick={() => setRoleScope("staff")}
            className={`rounded-md px-3 py-1 font-semibold transition-all ${
              roleScope === "staff"
                ? "bg-card text-foreground shadow-2xs"
                : "hover:text-foreground"
            }`}
          >
            Registered Staff ({staffList.filter((m) => m.role === "employee").length})
          </button>
          <button
            type="button"
            onClick={() => setRoleScope("all")}
            className={`rounded-md px-3 py-1 font-semibold transition-all ${
              roleScope === "all"
                ? "bg-card text-foreground shadow-2xs"
                : "hover:text-foreground"
            }`}
          >
            All Accounts ({staffList.length})
          </button>
        </div>
      </div>

      {/* Period Selectors + Summary Progress Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Weekly Compliance Summary */}
        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Weekly Report Compliance
              </span>
              <p className="font-display text-lg sm:text-xl font-bold text-foreground tabular-nums mt-0.5">
                {weeklySubmittedCount} / {totalMembers} Submitted ({weeklyPercent}%)
              </p>
            </div>
            <select
              value={selectedWeekKey}
              onChange={(e) => setSelectedWeekKey(e.target.value)}
              className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground font-medium focus:border-accent focus:outline-none"
            >
              {weekOptions.map((w) => (
                <option key={w.key} value={w.key}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>

          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${weeklyPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] tabular-nums">
            <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
              {weeklySubmittedCount} submitted
            </span>
            <span className="text-rose-600 dark:text-rose-400 font-semibold">
              {Math.max(0, totalMembers - weeklySubmittedCount)} not submitted
            </span>
          </div>
        </div>

        {/* Monthly Compliance Summary */}
        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Monthly Report Compliance
              </span>
              <p className="font-display text-lg sm:text-xl font-bold text-foreground tabular-nums mt-0.5">
                {monthlySubmittedCount} / {totalMembers} Submitted ({monthlyPercent}%)
              </p>
            </div>
            <select
              value={selectedMonthKey}
              onChange={(e) => setSelectedMonthKey(e.target.value)}
              className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground font-medium focus:border-accent focus:outline-none"
            >
              {monthOptions.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-300"
              style={{ width: `${monthlyPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] tabular-nums">
            <span className="text-blue-700 dark:text-blue-300 font-semibold">
              {monthlySubmittedCount} submitted
            </span>
            <span className="text-rose-600 dark:text-rose-400 font-semibold">
              {Math.max(0, totalMembers - monthlySubmittedCount)} not submitted
            </span>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {notice && (
        <div
          className={`rounded-lg border p-3 text-xs font-medium flex items-center justify-between gap-2 ${
            notice.type === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
              : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
          }`}
        >
          <span>{notice.text}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="opacity-70 hover:opacity-100"
          >
            <IconX size={14} />
          </button>
        </div>
      )}

      {/* Search & Compliance Filter Row */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <IconSearch
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="Search staff name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-card py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>

          {departments.length > 0 && (
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:border-accent focus:outline-none"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="inline-flex flex-wrap items-center rounded-lg bg-muted p-1 text-muted-foreground text-xs border border-border/60">
          {(
            [
              { id: "all", label: "All" },
              { id: "missing_weekly", label: "Missing Weekly" },
              { id: "missing_monthly", label: "Missing Monthly" },
              { id: "missing_any", label: "Missing Either" },
              { id: "compliant", label: "Both Submitted" },
            ] as const
          ).map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setComplianceFilter(pill.id)}
              className={`rounded-md px-2.5 py-1 font-medium transition-all ${
                complianceFilter === pill.id
                  ? "bg-card text-foreground shadow-2xs font-semibold"
                  : "hover:text-foreground"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Staff Compliance Table */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-10 text-center text-xs text-muted-foreground">
          No registered users match the active filters.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs tabular-nums">
              <thead className="sticky top-0 z-10 border-b border-border bg-muted/70 backdrop-blur-xs font-semibold text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Registered Staff</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Weekly Report</th>
                  <th className="px-4 py-3">Monthly Report</th>
                  <th className="px-4 py-3">Assigned Tasks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map(
                  ({
                    member,
                    weeklyReport,
                    monthlyReport,
                    weeklySubmitted,
                    monthlySubmitted,
                    tasks,
                  }) => {
                    const name = member.full_name || member.email.split("@")[0];
                    const initials = name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();

                    return (
                      <tr
                        key={member.id}
                        className="hover:bg-muted/40 transition-colors duration-150"
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted border border-border text-[11px] font-bold text-foreground">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-semibold text-foreground truncate">
                                  {name}
                                </p>
                                {member.role !== "employee" && (
                                  <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase text-muted-foreground border border-border">
                                    {member.role === "super_admin"
                                      ? "CEO"
                                      : "Admin"}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {member.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-muted/60 px-2 py-1 border border-border/80 text-xs text-foreground">
                            <IconBuilding
                              size={12}
                              className="text-muted-foreground"
                            />
                            {member.department || "Operations"}
                          </span>
                        </td>

                        {/* Weekly Cell */}
                        <td className="px-4 py-3.5">
                          {weeklyReport ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <StatusBadge
                                status={weeklyReport.status}
                                size="sm"
                              />
                              <Link
                                href={`/reports/${weeklyReport.id}`}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline"
                              >
                                <IconEye size={12} />
                                {weeklySubmitted ? "View" : "View Draft"}
                              </Link>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-700 dark:text-rose-300 border border-rose-500/20">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                Not Submitted
                              </span>
                              {telegramBotConfigured && member.telegram_chat_id && (
                                <button
                                  type="button"
                                  disabled={
                                    remindingKey === `${member.id}_weekly`
                                  }
                                  onClick={() =>
                                    handleRemind(
                                      member.id,
                                      "weekly",
                                      activeWeek?.label || "this week"
                                    )
                                  }
                                  title="Send Telegram reminder"
                                  className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-0.5 text-[10px] font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                                >
                                  <IconSend size={10} className="text-sky-500" />
                                  {remindingKey === `${member.id}_weekly`
                                    ? "Sending..."
                                    : "Remind"}
                                </button>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Monthly Cell */}
                        <td className="px-4 py-3.5">
                          {monthlyReport ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <StatusBadge
                                status={monthlyReport.status}
                                size="sm"
                              />
                              <Link
                                href={`/reports/${monthlyReport.id}`}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline"
                              >
                                <IconEye size={12} />
                                {monthlySubmitted ? "View" : "View Draft"}
                              </Link>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-700 dark:text-rose-300 border border-rose-500/20">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                Not Submitted
                              </span>
                              {telegramBotConfigured && member.telegram_chat_id && (
                                <button
                                  type="button"
                                  disabled={
                                    remindingKey === `${member.id}_monthly`
                                  }
                                  onClick={() =>
                                    handleRemind(
                                      member.id,
                                      "monthly",
                                      activeMonth?.label || "this month"
                                    )
                                  }
                                  title="Send Telegram reminder"
                                  className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-0.5 text-[10px] font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                                >
                                  <IconSend size={10} className="text-sky-500" />
                                  {remindingKey === `${member.id}_monthly`
                                    ? "Sending..."
                                    : "Remind"}
                                </button>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Assigned Tasks Cell */}
                        <td className="px-4 py-3.5">
                          <Link
                            href="/tasks"
                            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-foreground hover:text-accent transition-colors"
                          >
                            <IconCheckSquare
                              size={12}
                              className="text-muted-foreground"
                            />
                            {tasks.pending === 0 && tasks.completed === 0 ? (
                              <span className="text-muted-foreground">
                                No tasks
                              </span>
                            ) : (
                              <span>
                                <strong className="text-amber-700 dark:text-amber-300">
                                  {tasks.pending} open
                                </strong>{" "}
                                &middot;{" "}
                                <span className="text-emerald-700 dark:text-emerald-300">
                                  {tasks.completed} done
                                </span>
                              </span>
                            )}
                          </Link>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-border bg-muted/40 px-4 py-2.5 text-[11px] text-muted-foreground">
            <span>
              Showing {filtered.length} of {scopedMembers.length} registered{" "}
              {roleScope === "staff" ? "staff members" : "accounts"}
            </span>
            <span className="inline-flex items-center gap-1 font-mono text-[10px]">
              <IconUser size={10} />
              WEEKLY &amp; MONTHLY COMPLIANCE
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
