import type {
  MonthlyReportData,
  ReportRow,
  WeeklyReportData,
} from "@/types/report";

export interface SummaryStaffMember {
  id: string;
  full_name: string | null;
  email: string;
  department: string | null;
  role: "employee" | "admin" | "super_admin";
}

export interface DepartmentSummaryRow {
  department: string;
  staffCount: number;
  submittedStaffCount: number;
  complianceRate: number | null;
  reportCount: number;
  reviewedCount: number;
  pendingReviewCount: number;
  draftCount: number;
  kpiCount: number;
  avgAchievement: number | null;
  incompleteCount: number;
  challengeCount: number;
  supportCount: number;
  status: "Strong" | "On Track" | "At Risk" | "No Filing";
}

export interface ReportHighlightItem {
  reportId: string;
  reportType: "weekly" | "monthly";
  authorName: string;
  department: string;
  periodLabel: string;
  status: ReportRow["status"];
  summary: string;
  avgAchievement: number | null;
  kpiCount: number;
}

export interface TextRollupItem {
  reportId: string;
  authorName: string;
  department: string;
  periodLabel: string;
  text: string;
  secondaryText?: string;
}

export interface IncompleteActivityItem {
  reportId: string;
  authorName: string;
  department: string;
  activity: string;
  reason: string;
}

export interface NonSubmitterItem {
  id: string;
  full_name: string;
  department: string;
  email: string;
  state: "missing" | "draft_only";
}

export interface ExecutiveSummaryInput {
  reportType: "weekly" | "monthly" | "all";
  periodStart: string | null;
  periodEnd: string | null;
  periodLabel: string;
  departmentFilter: string; // "all" or exact department name
  includeDrafts: boolean;
  reports: ReportRow[];
  staff: SummaryStaffMember[];
  generatedAtLabel: string;
}

export interface ExecutiveSummaryResult {
  meta: {
    reportType: "weekly" | "monthly" | "all";
    periodStart: string | null;
    periodEnd: string | null;
    periodLabel: string;
    departmentFilter: string;
    includeDrafts: boolean;
    generatedAtLabel: string;
  };
  metrics: {
    totalReports: number;
    weeklyReports: number;
    monthlyReports: number;
    reviewedCount: number;
    pendingReviewCount: number;
    draftCount: number;
    trackedStaffCount: number;
    submittedStaffCount: number;
    complianceRate: number | null;
    totalKpis: number;
    avgAchievement: number | null;
    kpisMeetingTarget: number; // >= 80%
    kpisBelowTarget: number; // < 60%
    incompleteCount: number;
    challengesCount: number;
    supportRequestsCount: number;
    performanceBand: "Exceeding Target" | "On Track" | "Needs Attention" | "Critical" | "No Data";
  };
  narrativeParagraphs: string[];
  keyTakeaways: string[];
  departments: DepartmentSummaryRow[];
  highlights: ReportHighlightItem[];
  challenges: TextRollupItem[];
  supportRequests: TextRollupItem[];
  nextPriorities: TextRollupItem[];
  incompleteActivities: IncompleteActivityItem[];
  nonSubmitters: NonSubmitterItem[];
}

/**
 * Safely parse a KPI achievement percentage string like "92%", "85.5", "100 %", or "78/100".
 */
export function parseAchievementPercent(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const cleaned = String(raw).trim();
  if (!cleaned) return null;

  // Match first numeric value (supports decimals)
  const match = cleaned.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;

  const num = Number(match[0]);
  if (!Number.isFinite(num) || num < 0) return null;
  // Cap extreme outliers like typos ("10000%") at 200% for sensible holding averages
  if (num > 200) return null;
  return num;
}

function cleanText(raw: string | undefined | null): string {
  if (!raw) return "";
  return String(raw).trim();
}

function isSubstantiveText(raw: string | undefined | null): boolean {
  const t = cleanText(raw).toLowerCase();
  if (!t) return false;
  const placeholders = new Set(["none", "n/a", "na", "nil", "-", "—", "nothing", "no", "no challenges", "none."]);
  return !placeholders.has(t);
}

function extractReportMetrics(report: ReportRow) {
  const scores: number[] = [];
  let kpiCount = 0;
  const incomplete: { activity: string; reason: string }[] = [];
  let executiveSummary = "";
  let challenge = "";
  let actionTaken = "";
  let support = "";
  let nextPriority = "";

  if (report.report_type === "weekly") {
    const d = (report.data || {}) as Partial<WeeklyReportData>;
    executiveSummary = cleanText(d.executiveSummary);
    challenge = cleanText(d.challenges);
    support = cleanText(d.supportRequired);
    nextPriority = cleanText(d.prioritiesNextWeek);

    for (const row of d.kpiRows || []) {
      const hasContent =
        cleanText(row.kpi) || cleanText(row.target) || cleanText(row.performance);
      if (!hasContent) continue;
      kpiCount += 1;
      const pct = parseAchievementPercent(row.percentAchievement);
      if (pct !== null) scores.push(pct);
    }

    for (const row of d.incompleteRows || []) {
      if (isSubstantiveText(row.activity)) {
        incomplete.push({
          activity: cleanText(row.activity),
          reason: cleanText(row.reason) || "No reason specified",
        });
      }
    }
  } else {
    const d = (report.data || {}) as Partial<MonthlyReportData>;
    executiveSummary = cleanText(d.executiveSummary);
    challenge = cleanText(d.challengeEncountered);
    actionTaken = cleanText(d.actionTaken);
    support = cleanText(d.supportAndFollowUp);
    nextPriority = cleanText(d.focusAreasNextMonth);

    for (const row of d.goalRows || []) {
      const hasContent =
        cleanText(row.plannedActivity) ||
        cleanText(row.kpi) ||
        cleanText(row.actualPerformance);
      if (!hasContent) continue;
      kpiCount += 1;
      const pct = parseAchievementPercent(row.percentage);
      if (pct !== null) scores.push(pct);
    }

    if (isSubstantiveText(d.activitiesPlannedNotExecuted)) {
      incomplete.push({
        activity: cleanText(d.activitiesPlannedNotExecuted),
        reason: "Planned monthly activity not executed",
      });
    }
  }

  const avgAchievement =
    scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : null;

  return {
    kpiCount,
    scores,
    avgAchievement,
    incomplete,
    executiveSummary,
    challenge,
    actionTaken,
    support,
    nextPriority,
  };
}

function getPerformanceBand(
  avg: number | null
): ExecutiveSummaryResult["metrics"]["performanceBand"] {
  if (avg === null) return "No Data";
  if (avg >= 90) return "Exceeding Target";
  if (avg >= 75) return "On Track";
  if (avg >= 55) return "Needs Attention";
  return "Critical";
}

function getDepartmentStatus(
  submittedReports: number,
  complianceRate: number | null,
  avgAchievement: number | null
): DepartmentSummaryRow["status"] {
  if (submittedReports === 0) return "No Filing";
  const goodCompliance = complianceRate === null || complianceRate >= 75;
  const strongKpi = avgAchievement !== null && avgAchievement >= 85;
  const weakKpi = avgAchievement !== null && avgAchievement < 65;

  if (weakKpi || (complianceRate !== null && complianceRate < 50)) {
    return "At Risk";
  }
  if (strongKpi && goodCompliance) {
    return "Strong";
  }
  return "On Track";
}

/**
 * Generates a structured, board-ready Executive Holding Summary from real report & staff data.
 */
export function generateExecutiveSummary(
  input: ExecutiveSummaryInput
): ExecutiveSummaryResult {
  const {
    reportType,
    periodStart,
    periodEnd,
    periodLabel,
    departmentFilter,
    includeDrafts,
    reports,
    staff,
    generatedAtLabel,
  } = input;

  // Filter reports by type, period overlap, department, and draft inclusion
  const periodReportsAllStatuses = reports.filter((r) => {
    if (reportType !== "all" && r.report_type !== reportType) return false;
    if (periodStart && periodEnd) {
      if (r.period_start > periodEnd || r.period_end < periodStart) return false;
    }
    const dept = r.author_department || r.profiles?.department || "Unassigned";
    if (departmentFilter !== "all" && dept !== departmentFilter) return false;
    return true;
  });

  const scopedReports = includeDrafts
    ? periodReportsAllStatuses
    : periodReportsAllStatuses.filter((r) => r.status !== "draft");

  // Tracked staff (employees for compliance calculations, filtered by department if active)
  const trackedStaff = staff.filter((s) => {
    if (s.role !== "employee") return false;
    if (departmentFilter !== "all" && (s.department || "Unassigned") !== departmentFilter) {
      return false;
    }
    return true;
  });

  const submittedUserIds = new Set<string>();
  const draftOnlyUserIds = new Set<string>();

  for (const r of periodReportsAllStatuses) {
    if (r.status === "submitted" || r.status === "reviewed") {
      submittedUserIds.add(r.user_id);
    } else if (r.status === "draft") {
      draftOnlyUserIds.add(r.user_id);
    }
  }

  const nonSubmitters: NonSubmitterItem[] = [];
  let submittedStaffCount = 0;

  for (const member of trackedStaff) {
    if (submittedUserIds.has(member.id)) {
      submittedStaffCount += 1;
    } else {
      nonSubmitters.push({
        id: member.id,
        full_name: member.full_name || member.email.split("@")[0] || "Staff Member",
        department: member.department || "Unassigned",
        email: member.email,
        state: draftOnlyUserIds.has(member.id) ? "draft_only" : "missing",
      });
    }
  }

  const complianceRate =
    trackedStaff.length > 0
      ? Math.round((submittedStaffCount / trackedStaff.length) * 100)
      : null;

  // Aggregate KPIs, highlights, challenges, support, priorities, incomplete items
  const allScores: number[] = [];
  let totalKpis = 0;
  let kpisMeetingTarget = 0;
  let kpisBelowTarget = 0;

  const highlights: ReportHighlightItem[] = [];
  const challenges: TextRollupItem[] = [];
  const supportRequests: TextRollupItem[] = [];
  const nextPriorities: TextRollupItem[] = [];
  const incompleteActivities: IncompleteActivityItem[] = [];

  // Per-department accumulators
  const deptMap = new Map<
    string,
    {
      staffIds: Set<string>;
      submittedStaffIds: Set<string>;
      reportCount: number;
      reviewedCount: number;
      pendingReviewCount: number;
      draftCount: number;
      kpiCount: number;
      scores: number[];
      incompleteCount: number;
      challengeCount: number;
      supportCount: number;
    }
  >();

  function ensureDept(deptName: string) {
    const key = deptName || "Unassigned";
    let entry = deptMap.get(key);
    if (!entry) {
      entry = {
        staffIds: new Set<string>(),
        submittedStaffIds: new Set<string>(),
        reportCount: 0,
        reviewedCount: 0,
        pendingReviewCount: 0,
        draftCount: 0,
        kpiCount: 0,
        scores: [],
        incompleteCount: 0,
        challengeCount: 0,
        supportCount: 0,
      };
      deptMap.set(key, entry);
    }
    return entry;
  }

  for (const member of trackedStaff) {
    const entry = ensureDept(member.department || "Unassigned");
    entry.staffIds.add(member.id);
    if (submittedUserIds.has(member.id)) {
      entry.submittedStaffIds.add(member.id);
    }
  }

  for (const r of scopedReports) {
    const dept = r.author_department || r.profiles?.department || "Unassigned";
    const authorName = r.author_name || r.profiles?.full_name || "Staff Member";
    const pLabel = `${r.period_start} to ${r.period_end}`;
    const entry = ensureDept(dept);

    entry.reportCount += 1;
    if (r.status === "reviewed") entry.reviewedCount += 1;
    else if (r.status === "submitted") entry.pendingReviewCount += 1;
    else entry.draftCount += 1;

    const extracted = extractReportMetrics(r);
    totalKpis += extracted.kpiCount;
    entry.kpiCount += extracted.kpiCount;

    for (const sc of extracted.scores) {
      allScores.push(sc);
      entry.scores.push(sc);
      if (sc >= 80) kpisMeetingTarget += 1;
      if (sc < 60) kpisBelowTarget += 1;
    }

    if (isSubstantiveText(extracted.executiveSummary)) {
      highlights.push({
        reportId: r.id,
        reportType: r.report_type,
        authorName,
        department: dept,
        periodLabel: pLabel,
        status: r.status,
        summary: extracted.executiveSummary,
        avgAchievement: extracted.avgAchievement,
        kpiCount: extracted.kpiCount,
      });
    }

    if (isSubstantiveText(extracted.challenge)) {
      entry.challengeCount += 1;
      challenges.push({
        reportId: r.id,
        authorName,
        department: dept,
        periodLabel: pLabel,
        text: extracted.challenge,
        secondaryText: isSubstantiveText(extracted.actionTaken)
          ? extracted.actionTaken
          : undefined,
      });
    }

    if (isSubstantiveText(extracted.support)) {
      entry.supportCount += 1;
      supportRequests.push({
        reportId: r.id,
        authorName,
        department: dept,
        periodLabel: pLabel,
        text: extracted.support,
      });
    }

    if (isSubstantiveText(extracted.nextPriority)) {
      nextPriorities.push({
        reportId: r.id,
        authorName,
        department: dept,
        periodLabel: pLabel,
        text: extracted.nextPriority,
      });
    }

    for (const inc of extracted.incomplete) {
      entry.incompleteCount += 1;
      incompleteActivities.push({
        reportId: r.id,
        authorName,
        department: dept,
        activity: inc.activity,
        reason: inc.reason,
      });
    }
  }

  const avgAchievement =
    allScores.length > 0
      ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10
      : null;

  const departments: DepartmentSummaryRow[] = Array.from(deptMap.entries())
    .map(([deptName, acc]) => {
      const staffCount = acc.staffIds.size;
      const subStaff = acc.submittedStaffIds.size;
      const comp = staffCount > 0 ? Math.round((subStaff / staffCount) * 100) : null;
      const deptAvg =
        acc.scores.length > 0
          ? Math.round((acc.scores.reduce((a, b) => a + b, 0) / acc.scores.length) * 10) / 10
          : null;

      return {
        department: deptName,
        staffCount,
        submittedStaffCount: subStaff,
        complianceRate: comp,
        reportCount: acc.reportCount,
        reviewedCount: acc.reviewedCount,
        pendingReviewCount: acc.pendingReviewCount,
        draftCount: acc.draftCount,
        kpiCount: acc.kpiCount,
        avgAchievement: deptAvg,
        incompleteCount: acc.incompleteCount,
        challengeCount: acc.challengeCount,
        supportCount: acc.supportCount,
        status: getDepartmentStatus(acc.reportCount, comp, deptAvg),
      };
    })
    .sort((a, b) => {
      if (b.reportCount !== a.reportCount) return b.reportCount - a.reportCount;
      return (b.avgAchievement ?? -1) - (a.avgAchievement ?? -1);
    });

  const weeklyReports = scopedReports.filter((r) => r.report_type === "weekly").length;
  const monthlyReports = scopedReports.filter((r) => r.report_type === "monthly").length;
  const reviewedCount = scopedReports.filter((r) => r.status === "reviewed").length;
  const pendingReviewCount = scopedReports.filter((r) => r.status === "submitted").length;
  const draftCount = scopedReports.filter((r) => r.status === "draft").length;
  const performanceBand = getPerformanceBand(avgAchievement);

  // Build Smart Executive Narrative
  const scopeTitle =
    departmentFilter === "all" ? "Yetaf Holding Limited" : `${departmentFilter} (Yetaf Holding)`;
  const typeLabel =
    reportType === "weekly"
      ? "weekly"
      : reportType === "monthly"
      ? "monthly"
      : "weekly and monthly";

  const narrativeParagraphs: string[] = [];

  if (scopedReports.length === 0) {
    narrativeParagraphs.push(
      `No ${includeDrafts ? "" : "submitted "}${typeLabel} reports were recorded for ${scopeTitle} during ${periodLabel}.`
    );
    if (nonSubmitters.length > 0) {
      narrativeParagraphs.push(
        `Currently ${nonSubmitters.length} registered staff member${
          nonSubmitters.length === 1 ? "" : "s"
        } remain outstanding for this reporting period. Leadership follow-up is recommended before closing the window.`
      );
    }
  } else {
    const p1Parts: string[] = [
      `For ${periodLabel}, ${scopeTitle} consolidated ${scopedReports.length} ${typeLabel} performance report${
        scopedReports.length === 1 ? "" : "s"
      } across ${departments.filter((d) => d.reportCount > 0).length} active department${
        departments.filter((d) => d.reportCount > 0).length === 1 ? "" : "s"
      }.`,
    ];

    if (complianceRate !== null) {
      p1Parts.push(
        `Overall submission compliance stands at ${complianceRate}% (${submittedStaffCount} of ${trackedStaff.length} registered staff submitted).`
      );
    }

    if (reviewedCount > 0 || pendingReviewCount > 0) {
      p1Parts.push(
        `${reviewedCount} report${reviewedCount === 1 ? " has" : "s have"} received executive sign-off while ${pendingReviewCount} await${
          pendingReviewCount === 1 ? "s" : ""
        } leadership review.`
      );
    }
    narrativeParagraphs.push(p1Parts.join(" "));

    // Paragraph 2: KPI achievement & department leaders / laggards
    const p2Parts: string[] = [];
    if (avgAchievement !== null) {
      p2Parts.push(
        `Across ${totalKpis} tracked KPI${totalKpis === 1 ? "" : "s"} (${allScores.length} quantified), average holding achievement is ${avgAchievement}% (${performanceBand}), with ${kpisMeetingTarget} KPI${
          kpisMeetingTarget === 1 ? "" : "s"
        } at or above 80% and ${kpisBelowTarget} below 60%.`
      );
    } else if (totalKpis > 0) {
      p2Parts.push(
        `A total of ${totalKpis} planned activities/KPIs were reported across submitting business units.`
      );
    }

    const scoredDepts = departments
      .filter((d) => d.avgAchievement !== null)
      .sort((a, b) => (b.avgAchievement ?? 0) - (a.avgAchievement ?? 0));

    if (scoredDepts.length >= 1) {
      const top = scoredDepts[0];
      p2Parts.push(
        `${top.department} led performance at ${top.avgAchievement}% average achievement (${top.reportCount} filing${
          top.reportCount === 1 ? "" : "s"
        }).`
      );
      if (scoredDepts.length >= 2) {
        const bottom = scoredDepts[scoredDepts.length - 1];
        if (bottom.department !== top.department && (bottom.avgAchievement ?? 100) < 75) {
          p2Parts.push(
            `${bottom.department} recorded the lowest average achievement at ${bottom.avgAchievement}% and warrants targeted follow-up.`
          );
        }
      }
    }
    if (p2Parts.length > 0) narrativeParagraphs.push(p2Parts.join(" "));

    // Paragraph 3: Risks, incomplete work, and leadership action items
    const p3Parts: string[] = [];
    if (challenges.length > 0 || incompleteActivities.length > 0) {
      p3Parts.push(
        `Operational flags include ${challenges.length} reported challenge${
          challenges.length === 1 ? "" : "s"
        } and ${incompleteActivities.length} planned activit${
          incompleteActivities.length === 1 ? "y" : "ies"
        } carried over or not completed.`
      );
    }
    if (supportRequests.length > 0) {
      p3Parts.push(
        `${supportRequests.length} unit${
          supportRequests.length === 1 ? " has" : "s have"
        } escalated specific decisions or holding-level support requirements for executive action.`
      );
    }
    if (nonSubmitters.length > 0) {
      p3Parts.push(
        `${nonSubmitters.length} registered staff member${
          nonSubmitters.length === 1 ? " has" : "s have"
        } not yet submitted for this period.`
      );
    }
    if (p3Parts.length > 0) narrativeParagraphs.push(p3Parts.join(" "));
  }

  // Build crisp bullet key takeaways
  const keyTakeaways: string[] = [];
  if (complianceRate !== null) {
    keyTakeaways.push(
      `Reporting compliance: ${complianceRate}% (${submittedStaffCount}/${trackedStaff.length} staff submitted${
        nonSubmitters.length > 0 ? `, ${nonSubmitters.length} pending` : " — 100% compliant"
      }).`
    );
  }
  if (avgAchievement !== null) {
    keyTakeaways.push(
      `Group KPI achievement averaged ${avgAchievement}% (${performanceBand}) across ${allScores.length} scored indicators.`
    );
  }
  if (pendingReviewCount > 0) {
    keyTakeaways.push(
      `${pendingReviewCount} submitted filing${
        pendingReviewCount === 1 ? "" : "s"
      } currently await executive review and sign-off.`
    );
  }
  if (supportRequests.length > 0) {
    keyTakeaways.push(
      `${supportRequests.length} department escalation${
        supportRequests.length === 1 ? "" : "s"
      } require holding-level support or decisions.`
    );
  }
  if (incompleteActivities.length > 0) {
    keyTakeaways.push(
      `${incompleteActivities.length} planned activit${
        incompleteActivities.length === 1 ? "y was" : "ies were"
      } reported incomplete and should be tracked into the next cycle.`
    );
  }

  return {
    meta: {
      reportType,
      periodStart,
      periodEnd,
      periodLabel,
      departmentFilter,
      includeDrafts,
      generatedAtLabel,
    },
    metrics: {
      totalReports: scopedReports.length,
      weeklyReports,
      monthlyReports,
      reviewedCount,
      pendingReviewCount,
      draftCount,
      trackedStaffCount: trackedStaff.length,
      submittedStaffCount,
      complianceRate,
      totalKpis,
      avgAchievement,
      kpisMeetingTarget,
      kpisBelowTarget,
      incompleteCount: incompleteActivities.length,
      challengesCount: challenges.length,
      supportRequestsCount: supportRequests.length,
      performanceBand,
    },
    narrativeParagraphs,
    keyTakeaways,
    departments,
    highlights,
    challenges,
    supportRequests,
    nextPriorities,
    incompleteActivities,
    nonSubmitters,
  };
}

/**
 * Formats an ExecutiveSummaryResult as a clean plain-text brief for clipboard, email, or Telegram.
 */
export function formatExecutiveSummaryText(summary: ExecutiveSummaryResult): string {
  const { meta, metrics } = summary;
  const lines: string[] = [
    "YETAF HOLDING LIMITED — EXECUTIVE HOLDING SUMMARY",
    `Period: ${meta.periodLabel} (${meta.reportType.toUpperCase()})`,
    `Scope: ${meta.departmentFilter === "all" ? "All Subsidiaries & Departments" : meta.departmentFilter}`,
    `Generated: ${meta.generatedAtLabel}`,
    "──────────────────────────────────────────────",
    "",
    "KEY METRICS",
    `• Reports Included: ${metrics.totalReports} (${metrics.reviewedCount} reviewed, ${metrics.pendingReviewCount} pending review)`,
    `• Submission Compliance: ${
      metrics.complianceRate !== null
        ? `${metrics.complianceRate}% (${metrics.submittedStaffCount}/${metrics.trackedStaffCount} staff)`
        : "N/A"
    }`,
    `• Avg KPI Achievement: ${
      metrics.avgAchievement !== null
        ? `${metrics.avgAchievement}% (${metrics.performanceBand})`
        : "No quantified KPIs"
    }`,
    `• Challenges: ${metrics.challengesCount} | Support Requests: ${metrics.supportRequestsCount} | Incomplete: ${metrics.incompleteCount}`,
    "",
    "EXECUTIVE NARRATIVE",
    ...summary.narrativeParagraphs.map((p) => p),
    "",
  ];

  if (summary.departments.length > 0) {
    lines.push("DEPARTMENT PERFORMANCE");
    for (const d of summary.departments) {
      const comp = d.complianceRate !== null ? `${d.complianceRate}% compliance` : "—";
      const kpi = d.avgAchievement !== null ? `${d.avgAchievement}% KPI avg` : "no KPI %";
      lines.push(`• ${d.department}: ${d.reportCount} report(s) | ${comp} | ${kpi} [${d.status}]`);
    }
    lines.push("");
  }

  if (summary.supportRequests.length > 0) {
    lines.push("HOLDING SUPPORT / DECISIONS REQUIRED");
    for (const s of summary.supportRequests) {
      lines.push(`• [${s.department} — ${s.authorName}] ${s.text}`);
    }
    lines.push("");
  }

  if (summary.challenges.length > 0) {
    lines.push("KEY CHALLENGES");
    for (const c of summary.challenges) {
      lines.push(`• [${c.department} — ${c.authorName}] ${c.text}`);
    }
    lines.push("");
  }

  if (summary.nonSubmitters.length > 0) {
    lines.push(`OUTSTANDING / NOT SUBMITTED (${summary.nonSubmitters.length})`);
    for (const ns of summary.nonSubmitters) {
      lines.push(
        `• ${ns.full_name} (${ns.department}) — ${
          ns.state === "draft_only" ? "Draft Only" : "Not Submitted"
        }`
      );
    }
  }

  return lines.join("\n").trim();
}
