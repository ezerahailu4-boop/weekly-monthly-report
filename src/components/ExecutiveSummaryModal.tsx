"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  buildMonthOptions,
  buildWeekOptions,
} from "@/lib/compliancePeriods";
import {
  formatExecutiveSummaryText,
  generateExecutiveSummary,
  type DepartmentSummaryRow,
  type ExecutiveSummaryResult,
  type SummaryStaffMember,
} from "@/lib/executiveSummary";
import {
  IconAlertCircle,
  IconBarChart,
  IconBuilding,
  IconCalendar,
  IconCheck,
  IconCheckCircle,
  IconClock,
  IconCopy,
  IconDownload,
  IconFileText,
  IconPrinter,
  IconTrendingUp,
  IconUsers,
  IconX,
} from "./Icons";
import type { ReportRow } from "@/types/report";

type SummaryTab = "overview" | "highlights" | "risks" | "compliance";

const DEPT_STATUS_STYLES: Record<DepartmentSummaryRow["status"], string> = {
  Strong:
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
  "On Track":
    "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25",
  "At Risk":
    "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/25",
  "No Filing":
    "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25",
};

export function ExecutiveSummaryTrigger({
  reports,
  staff,
  todayEthYmd,
}: {
  reports: ReportRow[];
  staff: SummaryStaffMember[];
  todayEthYmd: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Generate board-ready executive holding summary across all reports"
        className="inline-flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3.5 py-2 text-xs font-semibold text-foreground shadow-2xs hover:bg-accent/20 transition-colors cursor-pointer"
      >
        <IconBarChart size={14} className="text-accent" />
        Executive Summary
      </button>

      {open && (
        <ExecutiveSummaryModal
          reports={reports}
          staff={staff}
          todayEthYmd={todayEthYmd}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function ExecutiveSummaryModal({
  reports,
  staff,
  todayEthYmd,
  onClose,
}: {
  reports: ReportRow[];
  staff: SummaryStaffMember[];
  todayEthYmd: string;
  onClose: () => void;
}) {
  const weekOptions = useMemo(
    () => buildWeekOptions(todayEthYmd, reports),
    [todayEthYmd, reports]
  );
  const monthOptions = useMemo(
    () => buildMonthOptions(todayEthYmd, reports),
    [todayEthYmd, reports]
  );

  const [reportType, setReportType] = useState<"weekly" | "monthly" | "all">(
    "weekly"
  );
  const [selectedWeekKey, setSelectedWeekKey] = useState(
    weekOptions[0]?.key || ""
  );
  const [selectedMonthKey, setSelectedMonthKey] = useState(
    monthOptions[0]?.key || ""
  );
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [includeDrafts, setIncludeDrafts] = useState(false);
  const [activeTab, setActiveTab] = useState<SummaryTab>("overview");
  const [copied, setCopied] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ExecutiveSummaryResult>(
    emptySummaryResult(todayEthYmd, "weekly", "Current Week", "all", false)
  );

  const departmentsList = useMemo(() => {
    const set = new Set<string>();
    for (const s of staff) {
      if (s.department) set.add(s.department);
    }
    for (const r of reports) {
      const dept = r.author_department || r.profiles?.department;
      if (dept) set.add(dept);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [staff, reports]);

  const activePeriod = useMemo(() => {
    if (reportType === "weekly") {
      const opt =
        weekOptions.find((w) => w.key === selectedWeekKey) || weekOptions[0];
      return {
        start: opt?.start || null,
        end: opt?.end || null,
        label: opt?.label || "Current Week",
      };
    }
    if (reportType === "monthly") {
      const opt =
        monthOptions.find((m) => m.key === selectedMonthKey) || monthOptions[0];
      return {
        start: opt?.start || null,
        end: opt?.end || null,
        label: opt?.label || "Current Month",
      };
    }
    return {
      start: null,
      end: null,
      label: "All Reporting Periods",
    };
  }, [reportType, selectedWeekKey, selectedMonthKey, weekOptions, monthOptions]);

  useEffect(() => {
    let cancelled = false;
    const generatedAtLabel = `${todayEthYmd} · Live Portal Snapshot`;
    const compute = () => {
      try {
        const result = generateExecutiveSummary({
          reportType,
          periodStart: activePeriod.start,
          periodEnd: activePeriod.end,
          periodLabel: activePeriod.label,
          departmentFilter,
          includeDrafts,
          reports,
          staff,
          generatedAtLabel,
        });
        if (!cancelled) {
          setSummary(result);
          setSummaryError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setSummaryError(err instanceof Error ? err.message : "Failed to generate summary");
          setSummary(emptySummaryResult(todayEthYmd, reportType, activePeriod.label, departmentFilter, includeDrafts));
        }
      }
    };
    compute();
    return () => {
      cancelled = true;
    };
  }, [
    reportType,
    activePeriod,
    departmentFilter,
    includeDrafts,
    reports,
    staff,
    todayEthYmd,
  ]);

  const exportQueryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("type", reportType);
    if (activePeriod.start) params.set("start", activePeriod.start);
    if (activePeriod.end) params.set("end", activePeriod.end);
    params.set("label", activePeriod.label);
    params.set("department", departmentFilter);
    if (includeDrafts) params.set("includeDrafts", "true");
    return params.toString();
  }, [reportType, activePeriod, departmentFilter, includeDrafts]);

  async function handleCopyBrief() {
    const text = formatExecutiveSummaryText(summary);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback for restricted clipboard contexts
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  }

  const { metrics } = summary;
  const riskBadgeCount =
    summary.supportRequests.length +
    summary.challenges.length +
    summary.incompleteActivities.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-3 sm:p-5 backdrop-blur-xs animate-in fade-in-50"
      role="dialog"
      aria-modal="true"
      aria-label="Executive Holding Summary"
    >
      <div className="w-full max-w-5xl max-h-[92vh] rounded-xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Top Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border px-5 py-4 bg-muted/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
              <IconBarChart size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-base sm:text-lg font-extrabold text-foreground">
                  Executive Holding Summary
                </h2>
                <span className="hidden sm:inline-flex items-center rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
                  Smart Rollup
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Consolidated KPI performance, compliance, and escalations across YETAF Holding Limited
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyBrief}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <IconCheck size={13} className="text-emerald-600 dark:text-emerald-400" />
                  Copied!
                </>
              ) : (
                <>
                  <IconCopy size={13} className="text-muted-foreground" />
                  Copy Brief
                </>
              )}
            </button>

            <a
              href={`/api/reports/summary/export?format=pdf&${exportQueryString}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
            >
              <IconPrinter size={13} className="text-muted-foreground" />
              Export PDF
            </a>

            <a
              href={`/api/reports/summary/export?format=docx&${exportQueryString}`}
              download
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <IconDownload size={13} />
              Export DOCX
            </a>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Executive Summary"
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            >
              <IconX size={16} />
            </button>
          </div>
        </div>

        {/* Filter Controls Strip */}
        <div className="flex flex-wrap items-center gap-2.5 border-b border-border px-5 py-3 bg-card shrink-0">
          {/* Type Switcher */}
          <div className="inline-flex h-8 items-center rounded-lg bg-muted p-0.5 text-xs border border-border/60">
            {(
              [
                { id: "weekly", label: "Weekly" },
                { id: "monthly", label: "Monthly" },
                { id: "all", label: "All Time" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setReportType(opt.id)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                  reportType === opt.id
                    ? "bg-card text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Period Picker */}
          {reportType === "weekly" && weekOptions.length > 0 && (
            <div className="inline-flex items-center gap-1.5">
              <IconCalendar size={13} className="text-muted-foreground" />
              <select
                value={selectedWeekKey}
                onChange={(e) => setSelectedWeekKey(e.target.value)}
                aria-label="Select Reporting Week"
                className="h-8 rounded-lg border border-border bg-card px-2.5 text-xs text-foreground focus:border-accent focus:outline-none"
              >
                {weekOptions.map((w) => (
                  <option key={w.key} value={w.key}>
                    {w.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {reportType === "monthly" && monthOptions.length > 0 && (
            <div className="inline-flex items-center gap-1.5">
              <IconCalendar size={13} className="text-muted-foreground" />
              <select
                value={selectedMonthKey}
                onChange={(e) => setSelectedMonthKey(e.target.value)}
                aria-label="Select Reporting Month"
                className="h-8 rounded-lg border border-border bg-card px-2.5 text-xs text-foreground focus:border-accent focus:outline-none"
              >
                {monthOptions.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Department Picker */}
          <div className="inline-flex items-center gap-1.5">
            <IconBuilding size={13} className="text-muted-foreground" />
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              aria-label="Filter by Department"
              className="h-8 rounded-lg border border-border bg-card px-2.5 text-xs text-foreground focus:border-accent focus:outline-none"
            >
              <option value="all">All Departments ({departmentsList.length})</option>
              {departmentsList.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Include Drafts Checkbox */}
          <label className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeDrafts}
              onChange={(e) => setIncludeDrafts(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-border accent-accent"
            />
            <span>Include drafts</span>
          </label>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {summaryError && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 space-y-2">
              <div className="flex items-start gap-3">
                <IconAlertCircle size={18} className="text-rose-600 dark:text-rose-400 shrink-0" />
                <div>
                  <h3 className="text-xs font-bold text-rose-800 dark:text-rose-300">
                    Summary generation failed
                  </h3>
                  <p className="text-[11px] text-rose-700 dark:text-rose-300/90 whitespace-pre-wrap">
                    {summaryError}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSummaryError(null);
                }}
                className="text-xs font-medium text-accent hover:underline"
              >
                Try again
              </button>
            </div>
          )}
          {/* 4 Metric Tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border border-border bg-muted/25 p-3.5">
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span>Compliance</span>
                <IconUsers size={14} className="text-muted-foreground" />
              </div>
              <p
                className={`font-display text-2xl font-extrabold mt-1.5 tabular-nums ${
                  metrics.complianceRate === null
                    ? "text-foreground"
                    : metrics.complianceRate >= 80
                    ? "text-emerald-700 dark:text-emerald-300"
                    : metrics.complianceRate >= 50
                    ? "text-amber-700 dark:text-amber-300"
                    : "text-rose-700 dark:text-rose-300"
                }`}
              >
                {metrics.complianceRate !== null ? `${metrics.complianceRate}%` : "N/A"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                {metrics.submittedStaffCount}/{metrics.trackedStaffCount} staff submitted
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted/25 p-3.5">
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span>Avg KPI Score</span>
                <IconTrendingUp size={14} className="text-accent" />
              </div>
              <p className="font-display text-2xl font-extrabold mt-1.5 text-foreground tabular-nums">
                {metrics.avgAchievement !== null ? `${metrics.avgAchievement}%` : "—"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {metrics.performanceBand} · {metrics.totalKpis} KPI{metrics.totalKpis === 1 ? "" : "s"}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted/25 p-3.5">
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span>Reports</span>
                <IconFileText size={14} className="text-blue-600 dark:text-blue-400" />
              </div>
              <p className="font-display text-2xl font-extrabold mt-1.5 text-foreground tabular-nums">
                {metrics.totalReports}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                {metrics.reviewedCount} reviewed · {metrics.pendingReviewCount} pending
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted/25 p-3.5">
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span>Risks &amp; Support</span>
                <IconAlertCircle size={14} className="text-amber-600 dark:text-amber-400" />
              </div>
              <p className="font-display text-2xl font-extrabold mt-1.5 text-foreground tabular-nums">
                {metrics.supportRequestsCount + metrics.challengesCount}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                {metrics.supportRequestsCount} support · {metrics.incompleteCount} incomplete
              </p>
            </div>
          </div>

          {/* Sub-Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-border pb-2.5">
            {(
              [
                { id: "overview", label: "Overview & Departments", count: summary.departments.length },
                { id: "highlights", label: "Highlights & Priorities", count: summary.highlights.length },
                { id: "risks", label: "Risks & Support Needed", count: riskBadgeCount },
                { id: "compliance", label: "Not Submitted Roster", count: summary.nonSubmitters.length },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold tabular-nums ${
                    activeTab === tab.id
                      ? "bg-white/20 text-primary-foreground"
                      : tab.id === "compliance" && tab.count > 0
                      ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                      : "bg-card text-foreground"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* TAB 1: Overview & Departments */}
          {activeTab === "overview" && (
            <div className="space-y-5">
              {/* Executive Narrative Card */}
              <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
                    <IconCheckCircle size={15} className="text-accent" />
                    Auto-Generated Executive Narrative
                  </h3>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {summary.meta.periodLabel}
                  </span>
                </div>

                <div className="space-y-2 text-xs sm:text-sm text-foreground/90 leading-relaxed">
                  {summary.narrativeParagraphs.map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>

                {summary.keyTakeaways.length > 0 && (
                  <div className="pt-2 border-t border-border/60">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Key Leadership Takeaways
                    </p>
                    <ul className="space-y-1 text-xs text-foreground/90 list-disc pl-4">
                      {summary.keyTakeaways.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Department Scorecard Table */}
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="bg-muted/40 px-4 py-2.5 border-b border-border flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Department &amp; Subsidiary Breakdown
                  </h3>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {summary.departments.length} unit{summary.departments.length === 1 ? "" : "s"}
                  </span>
                </div>

                {summary.departments.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    No department data found for this filter.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/25 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                        <tr>
                          <th className="px-4 py-2.5 font-semibold">Department</th>
                          <th className="px-3 py-2.5 font-semibold text-right">Compliance</th>
                          <th className="px-3 py-2.5 font-semibold text-right">Reports</th>
                          <th className="px-3 py-2.5 font-semibold text-right">Reviewed</th>
                          <th className="px-3 py-2.5 font-semibold">Avg KPI %</th>
                          <th className="px-3 py-2.5 font-semibold text-right">Incomplete</th>
                          <th className="px-4 py-2.5 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {summary.departments.map((d) => (
                          <tr key={d.department} className="hover:bg-muted/25 transition-colors">
                            <td className="px-4 py-2.5 font-semibold text-foreground">
                              {d.department}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                              {d.complianceRate !== null
                                ? `${d.complianceRate}% (${d.submittedStaffCount}/${d.staffCount})`
                                : "—"}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums font-medium text-foreground">
                              {d.reportCount}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                              {d.reviewedCount}
                            </td>
                            <td className="px-3 py-2.5 min-w-[130px]">
                              {d.avgAchievement !== null ? (
                                <div className="flex items-center gap-2">
                                  <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        d.avgAchievement >= 80
                                          ? "bg-emerald-500"
                                          : d.avgAchievement >= 60
                                          ? "bg-amber-500"
                                          : "bg-rose-500"
                                      }`}
                                      style={{
                                        width: `${Math.min(100, Math.max(4, d.avgAchievement))}%`,
                                      }}
                                    />
                                  </div>
                                  <span className="font-semibold tabular-nums text-foreground">
                                    {d.avgAchievement}%
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                              {d.incompleteCount}
                            </td>
                            <td className="px-4 py-2.5">
                              <span
                                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${DEPT_STATUS_STYLES[d.status]}`}
                              >
                                {d.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Highlights & Priorities */}
          {activeTab === "highlights" && (
            <div className="space-y-5">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                  Unit Executive Highlights ({summary.highlights.length})
                </h3>
                {summary.highlights.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                    No executive summary paragraphs submitted for this period.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {summary.highlights.map((h) => (
                      <div
                        key={h.reportId}
                        className="rounded-xl border border-border bg-muted/20 p-4 space-y-1.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-foreground">
                              {h.department}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              &middot; {h.authorName}
                            </span>
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                              {h.reportType}
                            </span>
                            {h.avgAchievement !== null && (
                              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                                KPI {h.avgAchievement}%
                              </span>
                            )}
                          </div>
                          <Link
                            href={`/reports/${h.reportId}`}
                            className="text-[11px] font-semibold text-accent hover:underline"
                          >
                            Open Report →
                          </Link>
                        </div>
                        <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                          {h.summary}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                  Next Period Priorities &amp; Focus Areas ({summary.nextPriorities.length})
                </h3>
                {summary.nextPriorities.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                    No next-period priorities recorded.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {summary.nextPriorities.map((p, idx) => (
                      <div
                        key={`${p.reportId}-${idx}`}
                        className="rounded-xl border border-border bg-card p-3.5 space-y-1"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-foreground">
                            {p.department} — {p.authorName}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {p.periodLabel}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                          {p.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Risks & Support Needed */}
          {activeTab === "risks" && (
            <div className="space-y-5">
              {/* Support Requests */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 mb-2.5">
                  Holding Support &amp; Decisions Required ({summary.supportRequests.length})
                </h3>
                {summary.supportRequests.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
                    No holding support or executive decisions escalated in this period.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {summary.supportRequests.map((s, idx) => (
                      <div
                        key={`${s.reportId}-${idx}`}
                        className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-bold text-accent-strong dark:text-accent">
                            {s.department} — {s.authorName}
                          </span>
                          <Link
                            href={`/reports/${s.reportId}`}
                            className="text-[11px] font-semibold text-amber-900 dark:text-amber-300 hover:underline"
                          >
                            View Report →
                          </Link>
                        </div>
                        <p className="text-xs text-accent-strong/90 dark:text-accent whitespace-pre-wrap leading-relaxed">
                          {s.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Challenges */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                  Key Challenges &amp; Mitigation Actions ({summary.challenges.length})
                </h3>
                {summary.challenges.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
                    No operational challenges documented.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {summary.challenges.map((c, idx) => (
                      <div
                        key={`${c.reportId}-${idx}`}
                        className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-foreground">
                            {c.department} — {c.authorName}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {c.periodLabel}
                          </span>
                        </div>
                        <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                          {c.text}
                        </p>
                        {c.secondaryText && (
                          <div className="pt-1.5 border-t border-border/60 text-xs text-emerald-700 dark:text-emerald-300">
                            <span className="font-semibold">Action Taken: </span>
                            {c.secondaryText}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Incomplete Planned Activities */}
              {summary.incompleteActivities.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 mb-2.5">
                    Planned Activities Not Completed ({summary.incompleteActivities.length})
                  </h3>
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                        <tr>
                          <th className="px-4 py-2 font-semibold">Unit / Staff</th>
                          <th className="px-4 py-2 font-semibold">Activity</th>
                          <th className="px-4 py-2 font-semibold">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {summary.incompleteActivities.map((inc, idx) => (
                          <tr key={`${inc.reportId}-${idx}`}>
                            <td className="px-4 py-2.5 align-top whitespace-nowrap">
                              <p className="font-semibold text-foreground">{inc.department}</p>
                              <p className="text-[11px] text-muted-foreground">{inc.authorName}</p>
                            </td>
                            <td className="px-4 py-2.5 align-top text-foreground">
                              {inc.activity}
                            </td>
                            <td className="px-4 py-2.5 align-top text-muted-foreground">
                              {inc.reason}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Compliance Roster */}
          {activeTab === "compliance" && (
            <div className="space-y-3">
              {summary.nonSubmitters.length === 0 ? (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center space-y-1.5">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                    <IconCheckCircle size={20} />
                  </div>
                  <p className="text-sm font-bold text-emerald-900 dark:text-brand">
                    100% Reporting Compliance!
                  </p>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300/90">
                    All tracked staff in this scope have submitted their report for {summary.meta.periodLabel}.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="bg-rose-500/10 px-4 py-2.5 border-b border-rose-500/20 flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-800 dark:text-accent flex items-center gap-1.5">
                      <IconClock size={14} />
                      {summary.nonSubmitters.length} Staff Member
                      {summary.nonSubmitters.length === 1 ? "" : "s"} Pending Submission
                    </span>
                    <span className="text-[11px] text-rose-700 dark:text-rose-300">
                      {summary.meta.periodLabel}
                    </span>
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/25 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                      <tr>
                        <th className="px-4 py-2 font-semibold">Staff Name</th>
                        <th className="px-4 py-2 font-semibold">Department</th>
                        <th className="px-4 py-2 font-semibold">Email</th>
                        <th className="px-4 py-2 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {summary.nonSubmitters.map((ns) => (
                        <tr key={ns.id} className="hover:bg-muted/20">
                          <td className="px-4 py-2.5 font-semibold text-foreground">
                            {ns.full_name}
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground">
                            {ns.department}
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground font-mono text-[11px]">
                            {ns.email}
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                                ns.state === "draft_only"
                                  ? "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/25"
                                  : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25"
                              }`}
                            >
                              {ns.state === "draft_only" ? "Draft Only" : "Not Submitted"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-3 bg-muted/20 text-[11px] text-muted-foreground shrink-0">
          <span>
            Showing{" "}
            <strong className="text-foreground">{metrics.totalReports}</strong>{" "}
            report{metrics.totalReports === 1 ? "" : "s"} ·{" "}
            <strong className="text-foreground">{summary.meta.periodLabel}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Returns an empty ExecutiveSummaryResult used as a safe fallback when
 * summary generation fails, so the modal still renders instead of crashing.
 */
function emptySummaryResult(
  todayEthYmd: string,
  reportType: "weekly" | "monthly" | "all",
  periodLabel: string,
  departmentFilter: string,
  includeDrafts: boolean
): ExecutiveSummaryResult {
  return {
    meta: {
      reportType,
      periodStart: null,
      periodEnd: null,
      periodLabel,
      departmentFilter,
      includeDrafts,
      generatedAtLabel: `${todayEthYmd} · Live Portal Snapshot`,
    },
    metrics: {
      totalReports: 0,
      weeklyReports: 0,
      monthlyReports: 0,
      reviewedCount: 0,
      pendingReviewCount: 0,
      draftCount: 0,
      trackedStaffCount: 0,
      submittedStaffCount: 0,
      complianceRate: null,
      totalKpis: 0,
      avgAchievement: null,
      kpisMeetingTarget: 0,
      kpisBelowTarget: 0,
      incompleteCount: 0,
      challengesCount: 0,
      supportRequestsCount: 0,
      performanceBand: "No Data",
    },
    narrativeParagraphs: [],
    keyTakeaways: [],
    departments: [],
    highlights: [],
    challenges: [],
    supportRequests: [],
    nextPriorities: [],
    incompleteActivities: [],
    nonSubmitters: [],
  };
}

