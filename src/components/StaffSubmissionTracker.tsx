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
  IconAlertCircle,
  IconBuilding,
  IconCheckCircle,
  IconCheckSquare,
  IconDownload,
  IconEye,
  IconFileText,
  IconSearch,
  IconSend,
  IconShield,
  IconUser,
  IconX,
} from "./Icons";
import type { ReportRow } from "@/types/report";
import type { DisciplinaryWarningRow } from "@/types/warning";

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
  initialWarnings = [],
  initialComplianceFilter = "all",
  highlightMissingOnly = false,
}: {
  staffList: TrackedStaffMember[];
  reports: ReportRow[];
  taskStats?: Record<string, StaffTaskCounts>;
  todayEthYmd: string;
  telegramBotConfigured?: boolean;
  initialWarnings?: DisciplinaryWarningRow[];
  initialComplianceFilter?: ComplianceFilter;
  highlightMissingOnly?: boolean;
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
    useState<ComplianceFilter>(initialComplianceFilter);
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [remindingKey, setRemindingKey] = useState<string | null>(null);
  const [warningActionKey, setWarningActionKey] = useState<string | null>(null);
  const [enforcingType, setEnforcingType] = useState<"weekly" | "monthly" | null>(null);
  const [warnings, setWarnings] = useState<DisciplinaryWarningRow[]>(initialWarnings);
  const [showDisciplinaryLog, setShowDisciplinaryLog] = useState(
    initialWarnings.some((w) => w.status !== "revoked")
  );
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

    const memberWarnings = warnings.filter(
      (w) => w.user_id === member.id && w.status !== "revoked"
    );
    const weeklyWarning = activeWeek
      ? memberWarnings.find(
          (w) =>
            w.report_type === "weekly" &&
            w.period_start === activeWeek.start &&
            w.period_end === activeWeek.end
        ) || null
      : null;
    const monthlyWarning = activeMonth
      ? memberWarnings.find(
          (w) =>
            w.report_type === "monthly" &&
            w.period_start === activeMonth.start &&
            w.period_end === activeMonth.end
        ) || null
      : null;

    return {
      member,
      weeklyReport,
      monthlyReport,
      weeklySubmitted,
      monthlySubmitted,
      memberWarnings,
      activeStrikeCount: memberWarnings.length,
      weeklyWarning,
      monthlyWarning,
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

  async function handleIssueWarning(
    userId: string,
    reportType: "weekly" | "monthly",
    period: { start: string; end: string; label: string }
  ) {
    const key = `${userId}_${reportType}`;
    setWarningActionKey(key);
    setNotice(null);
    try {
      const res = await fetch("/api/warnings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          reportType,
          periodStart: period.start,
          periodEnd: period.end,
          periodLabel: period.label,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setNotice({
          type: "err",
          text: data.error || "Could not issue warning.",
        });
      } else if (data.warning) {
        setWarnings((prev) => [data.warning, ...prev]);
        setShowDisciplinaryLog(true);
        const w = data.warning as DisciplinaryWarningRow;
        const levelLabel =
          w.warning_level === "written_letter"
            ? `2nd Offense Written Warning Letter (${w.letter_ref}) prepared`
            : "1st Offense Verbal Warning issued";
        const tgNote = data.telegram?.sent
          ? "and sent to Telegram!"
          : `(saved to portal; Telegram: ${data.telegram?.error || "not linked"})`;
        setNotice({
          type: "ok",
          text: `${levelLabel} for ${w.employee_name || "staff member"} ${tgNote}`,
        });
      }
    } catch (err: unknown) {
      setNotice({
        type: "err",
        text: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      setWarningActionKey(null);
    }
  }

  async function handleEnforcePeriod(reportType: "weekly" | "monthly") {
    const period = reportType === "weekly" ? activeWeek : activeMonth;
    if (!period) return;
    setEnforcingType(reportType);
    setNotice(null);
    try {
      const res = await fetch("/api/warnings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "enforce_period",
          periods: [
            {
              reportType,
              periodStart: period.start,
              periodEnd: period.end,
              periodLabel: period.label,
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setNotice({
          type: "err",
          text: data.error || "Failed to run enforcement check.",
        });
      } else {
        const s = data.summary;
        if (Array.isArray(s.issuedWarnings) && s.issuedWarnings.length > 0) {
          setWarnings((prev) => [...s.issuedWarnings, ...prev]);
          setShowDisciplinaryLog(true);
        }
        setNotice({
          type: "ok",
          text:
            `Enforcement complete for ${period.label}: ` +
            `${s.verbalIssued} Verbal Warning(s) & ${s.lettersIssued} Written Letter(s) issued` +
            ` (${s.telegramSent} sent on Telegram` +
            `${s.alreadyWarned > 0 ? `, ${s.alreadyWarned} already warned` : ""}).`,
        });
      }
    } catch (err: unknown) {
      setNotice({
        type: "err",
        text: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      setEnforcingType(null);
    }
  }

  async function handleWarningRowAction(
    warningId: string,
    action: "resend_telegram" | "revoke"
  ) {
    setWarningActionKey(`row_${warningId}_${action}`);
    setNotice(null);
    try {
      const res = await fetch(`/api/warnings/${warningId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.warning) {
        setWarnings((prev) =>
          prev.map((w) => (w.id === warningId ? data.warning : w))
        );
      }
      if (!res.ok || !data.success) {
        setNotice({
          type: "err",
          text: data.error || "Could not update warning.",
        });
      } else {
        setNotice({
          type: "ok",
          text:
            action === "resend_telegram"
              ? "Warning delivered via Telegram!"
              : "Warning revoked and removed from active strike count.",
        });
      }
    } catch (err: unknown) {
      setNotice({
        type: "err",
        text: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      setWarningActionKey(null);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-start gap-2.5">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
              highlightMissingOnly
                ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                : "bg-accent/10 text-accent"
            }`}
          >
            {highlightMissingOnly ? (
              <IconAlertCircle size={18} />
            ) : (
              <IconCheckCircle size={18} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-sm sm:text-base font-bold text-foreground">
                {highlightMissingOnly
                  ? "Personnel With Missing Submissions"
                  : "Registered Staff Weekly & Monthly Submission Tracker"}
              </h3>
              {highlightMissingOnly && (
                <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-300 border border-rose-500/25">
                  Action Required
                </span>
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground">
              {highlightMissingOnly
                ? "Staff members who have not submitted their required weekly or monthly reports. Remind them via Telegram or issue verbal/written warnings."
                : "Compare every registered user side-by-side to see who submitted or missed their Weekly and Monthly reports."}
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

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] tabular-nums">
            <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
              {weeklySubmittedCount} submitted
            </span>
            <div className="flex items-center gap-2">
              <span className="text-rose-600 dark:text-rose-400 font-semibold">
                {Math.max(0, totalMembers - weeklySubmittedCount)} not submitted
              </span>
              {activeWeek && totalMembers - weeklySubmittedCount > 0 && (
                <button
                  type="button"
                  disabled={enforcingType !== null}
                  onClick={() => handleEnforcePeriod("weekly")}
                  title="Automatically issue 1st Verbal Warning or 2nd Written Warning Letter to all missing staff for this week"
                  className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 disabled:opacity-50 transition-colors"
                >
                  <IconAlertCircle size={10} />
                  {enforcingType === "weekly" ? "Enforcing..." : "Auto-Warn Missing"}
                </button>
              )}
            </div>
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

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] tabular-nums">
            <span className="text-blue-700 dark:text-blue-300 font-semibold">
              {monthlySubmittedCount} submitted
            </span>
            <div className="flex items-center gap-2">
              <span className="text-rose-600 dark:text-rose-400 font-semibold">
                {Math.max(0, totalMembers - monthlySubmittedCount)} not submitted
              </span>
              {activeMonth && totalMembers - monthlySubmittedCount > 0 && (
                <button
                  type="button"
                  disabled={enforcingType !== null}
                  onClick={() => handleEnforcePeriod("monthly")}
                  title="Automatically issue 1st Verbal Warning or 2nd Written Warning Letter to all missing staff for this month"
                  className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 disabled:opacity-50 transition-colors"
                >
                  <IconAlertCircle size={10} />
                  {enforcingType === "monthly" ? "Enforcing..." : "Auto-Warn Missing"}
                </button>
              )}
            </div>
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
            highlightMissingOnly
              ? [
                  { id: "missing_any", label: "Missing Either" },
                  { id: "missing_weekly", label: "Missing Weekly" },
                  { id: "missing_monthly", label: "Missing Monthly" },
                  { id: "all", label: "All Staff" },
                  { id: "compliant", label: "Both Submitted" },
                ] as const
              : [
                  { id: "all", label: "All Staff" },
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
          {highlightMissingOnly
            ? "All registered staff have submitted their required reports for this period. No missing submissions!"
            : "No registered users match the active filters."}
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
                    memberWarnings,
                    activeStrikeCount,
                    weeklyWarning,
                    monthlyWarning,
                    tasks,
                  }) => {
                    const name = member.full_name || member.email.split("@")[0];
                    const initials = name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();
                    const latestWarning = memberWarnings[0] || null;

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
                              <div className="flex flex-wrap items-center gap-1.5">
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
                                {activeStrikeCount > 0 && latestWarning && (
                                  <Link
                                    href={`/warnings/${latestWarning.id}`}
                                    title="View employee warning / letter record"
                                    className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold border ${
                                      activeStrikeCount >= 2
                                        ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
                                        : "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30"
                                    }`}
                                  >
                                    {activeStrikeCount >= 2
                                      ? `${activeStrikeCount} Strikes · Letter`
                                      : "1 Verbal"}
                                  </Link>
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
                          {weeklySubmitted && weeklyReport ? (
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
                                View
                              </Link>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {weeklyReport ? (
                                <Link
                                  href={`/reports/${weeklyReport.id}`}
                                  className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-300 border border-amber-500/20 hover:underline"
                                >
                                  Draft Only
                                </Link>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-700 dark:text-rose-300 border border-rose-500/20">
                                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                  Not Submitted
                                </span>
                              )}
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
                              {weeklyWarning ? (
                                <Link
                                  href={`/warnings/${weeklyWarning.id}`}
                                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                                    weeklyWarning.warning_level === "written_letter"
                                      ? "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                                      : "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                                  }`}
                                >
                                  <IconFileText size={10} />
                                  {weeklyWarning.warning_level === "written_letter"
                                    ? "Letter Sent"
                                    : "Verbal Warned"}
                                </Link>
                              ) : (
                                activeWeek && (
                                  <button
                                    type="button"
                                    disabled={
                                      warningActionKey === `${member.id}_weekly`
                                    }
                                    onClick={() =>
                                      handleIssueWarning(
                                        member.id,
                                        "weekly",
                                        activeWeek
                                      )
                                    }
                                    title={
                                      activeStrikeCount === 0
                                        ? "1st Offense: Send Verbal Warning via Telegram"
                                        : "2nd Offense: Automatically prepare & send Official Written Warning Letter"
                                    }
                                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold transition-colors disabled:opacity-50 ${
                                      activeStrikeCount >= 1
                                        ? "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20"
                                        : "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20"
                                    }`}
                                  >
                                    <IconAlertCircle size={10} />
                                    {warningActionKey === `${member.id}_weekly`
                                      ? "Issuing..."
                                      : activeStrikeCount >= 1
                                      ? "Send Letter (2nd)"
                                      : "Verbal Warn (1st)"}
                                  </button>
                                )
                              )}
                            </div>
                          )}
                        </td>

                        {/* Monthly Cell */}
                        <td className="px-4 py-3.5">
                          {monthlySubmitted && monthlyReport ? (
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
                                View
                              </Link>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {monthlyReport ? (
                                <Link
                                  href={`/reports/${monthlyReport.id}`}
                                  className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-300 border border-amber-500/20 hover:underline"
                                >
                                  Draft Only
                                </Link>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-700 dark:text-rose-300 border border-rose-500/20">
                                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                  Not Submitted
                                </span>
                              )}
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
                              {monthlyWarning ? (
                                <Link
                                  href={`/warnings/${monthlyWarning.id}`}
                                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                                    monthlyWarning.warning_level === "written_letter"
                                      ? "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                                      : "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                                  }`}
                                >
                                  <IconFileText size={10} />
                                  {monthlyWarning.warning_level === "written_letter"
                                    ? "Letter Sent"
                                    : "Verbal Warned"}
                                </Link>
                              ) : (
                                activeMonth && (
                                  <button
                                    type="button"
                                    disabled={
                                      warningActionKey === `${member.id}_monthly`
                                    }
                                    onClick={() =>
                                      handleIssueWarning(
                                        member.id,
                                        "monthly",
                                        activeMonth
                                      )
                                    }
                                    title={
                                      activeStrikeCount === 0
                                        ? "1st Offense: Send Verbal Warning via Telegram"
                                        : "2nd Offense: Automatically prepare & send Official Written Warning Letter"
                                    }
                                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold transition-colors disabled:opacity-50 ${
                                      activeStrikeCount >= 1
                                        ? "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20"
                                        : "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20"
                                    }`}
                                  >
                                    <IconAlertCircle size={10} />
                                    {warningActionKey === `${member.id}_monthly`
                                      ? "Issuing..."
                                      : activeStrikeCount >= 1
                                      ? "Send Letter (2nd)"
                                      : "Verbal Warn (1st)"}
                                  </button>
                                )
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

      {/* Disciplinary Warnings & Official Letters Log */}
      {warnings.length > 0 && (
        <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowDisciplinaryLog((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left text-xs font-bold text-foreground hover:bg-muted/40 transition-colors"
          >
            <span className="inline-flex items-center gap-2">
              <IconShield size={14} className="text-rose-500" />
              Disciplinary Warnings &amp; Official Letters (
              {warnings.filter((w) => w.status !== "revoked").length} active)
            </span>
            <span className="text-[11px] font-medium text-muted-foreground">
              {showDisciplinaryLog ? "Hide Log" : "Show Log"}
            </span>
          </button>

          {showDisciplinaryLog && (
            <div className="border-t border-border divide-y divide-border/60 bg-card">
              {warnings.map((w) => {
                const isLetter = w.warning_level === "written_letter";
                const isRevoked = w.status === "revoked";
                return (
                  <div
                    key={w.id}
                    className={`flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 px-4 py-3 text-xs ${
                      isRevoked ? "opacity-55" : ""
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                            isLetter
                              ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
                              : "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30"
                          }`}
                        >
                          {isLetter
                            ? `Strike #${w.strike_number} · Written Letter`
                            : `Strike #${w.strike_number} · Verbal Warning`}
                        </span>

                        <span className="font-semibold text-foreground">
                          {w.employee_name || w.employee_email}
                        </span>

                        <span className="text-muted-foreground">
                          ({w.report_type === "monthly" ? "Monthly" : "Weekly"} ·{" "}
                          {w.period_label})
                        </span>

                        {w.letter_ref && (
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {w.letter_ref}
                          </span>
                        )}

                        {w.status === "acknowledged" && (
                          <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                            Acknowledged
                          </span>
                        )}
                        {isRevoked && (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                            Revoked
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-muted-foreground">
                        Telegram:{" "}
                        {w.telegram_sent_at ? (
                          <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                            Delivered
                          </span>
                        ) : (
                          <span className="text-amber-700 dark:text-amber-300">
                            {w.telegram_error || "Pending"}
                          </span>
                        )}
                        {" · "}Trigger: {w.trigger_source === "auto" ? "Automatic" : "Manual"}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <Link
                        href={`/warnings/${w.id}`}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-muted transition-colors"
                      >
                        <IconEye size={12} />
                        {isLetter ? "Open Letter" : "View Notice"}
                      </Link>

                      {isLetter && (
                        <a
                          href={`/api/warnings/${w.id}/docx`}
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-muted transition-colors"
                        >
                          <IconDownload size={12} />
                          .docx
                        </a>
                      )}

                      {!isRevoked && (
                        <>
                          <button
                            type="button"
                            disabled={warningActionKey !== null}
                            onClick={() =>
                              handleWarningRowAction(w.id, "resend_telegram")
                            }
                            className="inline-flex items-center gap-1 rounded-md border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-[11px] font-semibold text-sky-700 dark:text-sky-300 hover:bg-sky-500/20 disabled:opacity-50 transition-colors"
                          >
                            <IconSend size={11} />
                            Resend
                          </button>
                          <button
                            type="button"
                            disabled={warningActionKey !== null}
                            onClick={() => handleWarningRowAction(w.id, "revoke")}
                            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:text-rose-600 disabled:opacity-50 transition-colors"
                          >
                            Revoke
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
