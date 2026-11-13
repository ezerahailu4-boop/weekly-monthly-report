import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getPortalSettings } from "@/lib/portalSettings";
import { getWarningsList } from "@/lib/warnings";
import { evaluateReportingWindow, ETHIOPIA_TIMEZONE } from "@/lib/windowSchedule";
import { DashboardReportsTable } from "@/components/DashboardReportsTable";
import { ReportingWindowBanner } from "@/components/ReportingWindowBanner";
import {
  StaffSubmissionTracker,
  type StaffTaskCounts,
  type TrackedStaffMember,
} from "@/components/StaffSubmissionTracker";
import {
  buildMonthOptions,
  buildWeekOptions,
  findBestReportInPeriod,
} from "@/lib/compliancePeriods";
import { AppShell } from "@/components/AppShell";
import {
  IconAlertCircle,
  IconBell,
  IconCalendar,
  IconCheckCircle,
  IconCheckSquare,
  IconClock,
  IconCrown,
  IconDownload,
  IconFileText,
  IconLayers,
  IconLock,
  IconPlus,
  IconShield,
  IconTrendingUp,
  IconUser,
} from "@/components/Icons";
import type { ReportRow } from "@/types/report";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const isSuperAdmin = user.role === "super_admin";
  const isAdmin = user.role === "admin";
  const isPrivileged = isSuperAdmin || isAdmin;

  // By default, Super Admin and Admin view all group submissions; employees view their own.
  const activeView = params.view || (isPrivileged ? "company" : "personal");
  const isMissingView = activeView === "not_submitted" || activeView === "missing";
  const isPersonalView = activeView === "personal";

  interface DbReportRow {
    id: string;
    user_id: string;
    report_type: ReportRow["report_type"];
    period_start: string;
    period_end: string;
    status: ReportRow["status"];
    data: ReportRow["data"];
    review_notes: string | null;
    reviewed_by: string | null;
    reviewed_at: string | Date | null;
    created_at: string | Date;
    updated_at: string | Date;
    author_name: string | null;
    author_department: string | null;
    author_email: string | null;
    reviewer_name: string | null;
  }

  // Query reports from Neon
  let rawReportRows: DbReportRow[];
  if (isPrivileged) {
    // For CEO & Admins, retrieve all submissions to evaluate group compliance and missing staff
    rawReportRows = (await sql`
      SELECT r.id, r.user_id, r.report_type,
             to_char(r.period_start, 'YYYY-MM-DD') as period_start,
             to_char(r.period_end, 'YYYY-MM-DD') as period_end,
             r.status, r.data, r.review_notes, r.reviewed_by, r.reviewed_at,
             r.created_at, r.updated_at,
             u.full_name as author_name, u.department as author_department, u.email as author_email,
             rev.full_name as reviewer_name
      FROM reports r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN users rev ON r.reviewed_by = rev.id
      ORDER BY r.created_at DESC;
    `) as DbReportRow[];
  } else {
    rawReportRows = (await sql`
      SELECT r.id, r.user_id, r.report_type,
             to_char(r.period_start, 'YYYY-MM-DD') as period_start,
             to_char(r.period_end, 'YYYY-MM-DD') as period_end,
             r.status, r.data, r.review_notes, r.reviewed_by, r.reviewed_at,
             r.created_at, r.updated_at,
             u.full_name as author_name, u.department as author_department, u.email as author_email,
             rev.full_name as reviewer_name
      FROM reports r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN users rev ON r.reviewed_by = rev.id
      WHERE r.user_id = ${user.id}
      ORDER BY r.created_at DESC;
    `) as DbReportRow[];
  }

  const allReportList: ReportRow[] = rawReportRows.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    report_type: r.report_type,
    period_start: r.period_start,
    period_end: r.period_end,
    status: r.status,
    data: r.data,
    created_at: typeof r.created_at === "string" ? r.created_at : r.created_at.toISOString(),
    updated_at: typeof r.updated_at === "string" ? r.updated_at : r.updated_at.toISOString(),
    author_name: r.author_name,
    author_department: r.author_department,
    author_email: r.author_email,
    review_notes: r.review_notes,
    reviewed_by: r.reviewed_by,
    reviewed_at: r.reviewed_at ? (typeof r.reviewed_at === "string" ? r.reviewed_at : r.reviewed_at.toISOString()) : null,
    reviewer_name: r.reviewer_name,
    profiles: {
      full_name: r.author_name,
      department: r.author_department,
    },
  }));

  const reportList: ReportRow[] = isPersonalView
    ? allReportList.filter((r) => r.user_id === user.id)
    : allReportList;

  // Fetch portal settings, open tasks, warnings, and (for CEO/Admin) staff compliance data in parallel
  const [settings, myOpenTasks, staffRows, taskSummaryRows, allWarnings, myWarnings] =
    await Promise.all([
      getPortalSettings(),
      sql`
        SELECT id, title, priority, status, to_char(due_date, 'YYYY-MM-DD') as due_date
        FROM tasks
        WHERE assigned_to = ${user.id} AND status != 'completed'
        ORDER BY due_date ASC NULLS LAST, created_at DESC
        LIMIT 4;
      `,
      isPrivileged
        ? sql`
            SELECT id, full_name, email, department, role, telegram_chat_id
            FROM users
            ORDER BY full_name ASC;
          `
        : Promise.resolve([]),
      isPrivileged
        ? sql`
            SELECT assigned_to,
                   COUNT(*) FILTER (WHERE status != 'completed')::int AS pending_tasks,
                   COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_tasks
            FROM tasks
            GROUP BY assigned_to;
          `
        : Promise.resolve([]),
      isPrivileged
        ? getWarningsList()
        : Promise.resolve([]),
      getWarningsList(user.id),
    ]);

  const activePersonalWarnings = myWarnings.filter((w) => w.status !== "revoked");

  const windowStatus = evaluateReportingWindow(settings);
  const windowLocked = !windowStatus.isOpen && !isPrivileged;

  const staffList: TrackedStaffMember[] = staffRows.map((s) => ({
    id: s.id,
    full_name: s.full_name,
    email: s.email,
    department: s.department,
    role: s.role as "employee" | "admin" | "super_admin",
    telegram_chat_id: s.telegram_chat_id ?? null,
  }));

  const taskStats: Record<string, StaffTaskCounts> = {};
  for (const row of taskSummaryRows) {
    taskStats[row.assigned_to] = {
      pending: Number(row.pending_tasks || 0),
      completed: Number(row.completed_tasks || 0),
    };
  }

  const todayEthYmd = new Intl.DateTimeFormat("en-CA", {
    timeZone: ETHIOPIA_TIMEZONE,
  }).format(new Date());

  const activeWeekOption = buildWeekOptions(todayEthYmd, allReportList)[0];
  const activeMonthOption = buildMonthOptions(todayEthYmd, allReportList)[0];

  const notSubmittedStaff = isPrivileged
    ? staffList.filter((m) => {
        if (m.role !== "employee") return false;
        const weekly = activeWeekOption
          ? findBestReportInPeriod(allReportList, m.id, "weekly", activeWeekOption.start, activeWeekOption.end)
          : null;
        const monthly = activeMonthOption
          ? findBestReportInPeriod(allReportList, m.id, "monthly", activeMonthOption.start, activeMonthOption.end)
          : null;
        const weeklySub = weekly?.status === "submitted" || weekly?.status === "reviewed";
        const monthlySub = monthly?.status === "submitted" || monthly?.status === "reviewed";
        return !weeklySub || !monthlySub;
      })
    : [];

  const notSubmittedCount = notSubmittedStaff.length;

  const totalCount = reportList.length;
  const weeklyCount = reportList.filter((r) => r.report_type === "weekly").length;
  const monthlyCount = reportList.filter((r) => r.report_type === "monthly").length;
  const pendingReviewCount = reportList.filter((r) => r.status === "submitted").length;
  const reviewedCount = reportList.filter((r) => r.status === "reviewed").length;
  const draftCount = reportList.filter((r) => r.status === "draft").length;

  const displayName = user.full_name || user.email.split("@")[0] || "Executive";

  return (
    <AppShell
      user={user}
      title={isSuperAdmin ? "CEO Command Center" : "Executive Dashboard"}
      subtitle={isSuperAdmin ? "Yetaf Holding Group Oversight" : undefined}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* Executive Header Banner */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              {isSuperAdmin ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-950 px-2.5 py-0.5 text-[11px] font-bold text-amber-300 ring-1 ring-amber-500/30">
                  <IconCrown size={12} className="text-amber-400" />
                  Office of the CEO &amp; Board
                </span>
              ) : isAdmin ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-bold text-primary-foreground">
                  <IconShield size={12} />
                  Executive Management
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-foreground border border-border">
                  <IconUser size={12} className="text-muted-foreground" />
                  {user.department || "Operations & Logistics"}
                </span>
              )}
              <span>&middot;</span>
              <span>YETAF HOLDING LIMITED</span>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              {isSuperAdmin
                ? "Executive Command Center"
                : isAdmin
                ? `Executive Portal · Welcome, ${displayName}`
                : `Welcome back, ${displayName}`}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-3xl">
              {isSuperAdmin
                ? "Panoramic group-wide oversight: Inspect every performance report across all subsidiaries, review pending submissions, and steer holding milestones."
                : isAdmin
                ? "Manage reports, review department submissions, and provision user accounts across the holding company."
                : "Author, track, and submit your weekly and monthly performance reports directly to executive leadership."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isPrivileged && (
              <>
                <a
                  href="/api/reports/export/csv"
                  download
                  title="Download consolidated spreadsheet summary of all group submissions"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted transition-colors"
                >
                  <IconDownload size={14} className="text-muted-foreground" />
                  Export All (CSV)
                </a>

                <Link
                  href="/admin"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted transition-colors"
                >
                  <IconUser size={14} className="text-muted-foreground" />
                  Manage Users
                </Link>
              </>
            )}

            {windowLocked ? (
              <span
                title={`Reporting closed. ${windowStatus.countdownLabel}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs font-semibold text-amber-800 dark:text-amber-300 cursor-not-allowed"
              >
                <IconLock size={14} />
                Submissions Locked
              </span>
            ) : (
              <>
                <Link
                  href="/reports/new/weekly"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-2xs transition-all hover:bg-muted"
                >
                  <IconPlus size={14} className="text-muted-foreground" />
                  New Weekly
                </Link>

                <Link
                  href="/reports/new/monthly"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-xs transition-all hover:opacity-90"
                >
                  <IconPlus size={14} />
                  New Monthly
                </Link>
              </>
            )}

            <Link
              href="/tasks"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-2xs transition-all hover:bg-muted"
            >
              <IconCheckSquare size={14} className="text-accent" />
              Tasks{myOpenTasks.length > 0 ? ` (${myOpenTasks.length})` : ""}
            </Link>
          </div>
        </div>

        {/* Live Ethiopian Time Reporting Window Status */}
        <ReportingWindowBanner status={windowStatus} isPrivileged={isPrivileged} />

        {/* Personal Disciplinary Warnings / Written Warning Letters */}
        {activePersonalWarnings.length > 0 && (
          <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 p-4 sm:p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/20 text-rose-700 dark:text-rose-300">
                  <IconAlertCircle size={18} />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-rose-900 dark:text-rose-200">
                    Disciplinary Notice: {activePersonalWarnings.length} Active Warning
                    {activePersonalWarnings.length === 1 ? "" : "s"} on Record
                  </h3>
                  <p className="text-[11px] sm:text-xs text-rose-800/85 dark:text-rose-300/85">
                    1st missed report triggers a Verbal Warning on Telegram; a 2nd missed report automatically issues an Official Written Warning Letter.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {activePersonalWarnings.slice(0, 3).map((w) => {
                const isLetter = w.warning_level === "written_letter";
                return (
                  <div
                    key={w.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-rose-500/25 bg-card/90 px-3.5 py-2.5 text-xs"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                          isLetter
                            ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
                            : "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30"
                        }`}
                      >
                        {isLetter
                          ? `Strike #${w.strike_number} · Written Letter`
                          : "Strike #1 · Verbal Warning"}
                      </span>
                      <span className="font-semibold text-foreground">
                        {w.report_type === "monthly" ? "Monthly" : "Weekly"} Report ({w.period_label})
                      </span>
                      {w.letter_ref && (
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {w.letter_ref}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/warnings/${w.id}`}
                        className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-rose-700 transition-colors"
                      >
                        <IconFileText size={12} />
                        {isLetter ? "Open & Acknowledge Letter" : "View Warning"}
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
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* My Open Tasks & Telegram Notification Card */}
        {(myOpenTasks.length > 0 || !user.telegram_chat_id) && (
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <IconCheckSquare size={15} className="text-accent" />
                  {myOpenTasks.length > 0
                    ? `You have ${myOpenTasks.length} pending assigned task${myOpenTasks.length === 1 ? "" : "s"}`
                    : "Stay notified on Telegram"}
                </span>
                {!user.telegram_chat_id && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-800 dark:text-sky-300 border border-sky-500/25">
                    <IconBell size={10} />
                    Telegram Not Linked
                  </span>
                )}
              </div>
              {myOpenTasks.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-0.5">
                  {myOpenTasks.map((t) => (
                    <Link
                      key={t.id}
                      href="/tasks"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      <span className="truncate max-w-[200px]">{t.title}</span>
                      {t.due_date && (
                        <span className="text-[10px] text-muted-foreground font-mono">
                          ({t.due_date})
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Link your Telegram account to receive instant task notifications from management.
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/tasks"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-all"
              >
                <IconCheckSquare size={13} />
                {myOpenTasks.length > 0 ? "Open & Complete Tasks" : "Connect Telegram & View Tasks"}
              </Link>
            </div>
          </div>
        )}

        {/* Executive "Needs Attention" alert card if there are pending items */}
        {pendingReviewCount > 0 && isPrivileged && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-in fade-in-50">
            <div className="flex items-start sm:items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300">
                <IconAlertCircle size={18} />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-amber-950 dark:text-amber-200">
                  {pendingReviewCount} Submission{pendingReviewCount === 1 ? "" : "s"} Awaiting Executive Review
                </h3>
                <p className="text-[11px] sm:text-xs text-amber-900 dark:text-amber-300/85">
                  Business units have submitted weekly &amp; monthly filings ready for leadership feedback and sign-off.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <span className="text-[11px] font-semibold text-amber-950 dark:text-amber-200">
                Action Required
              </span>
            </div>
          </div>
        )}

        {/* 4 Polished Stat Cards with Trend Indicators */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {/* Total Reports */}
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs transition-all hover:shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {isPrivileged && activeView === "company" ? "Total Group Filings" : "My Filings"}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <IconLayers size={16} />
              </div>
            </div>
            <p className="font-display text-2xl sm:text-3xl font-bold text-foreground mt-3 tabular-nums">
              {totalCount}
            </p>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground tabular-nums">
              <IconTrendingUp size={12} className="text-accent" />
              <span>{weeklyCount} weekly &middot; {monthlyCount} monthly</span>
            </div>
          </div>

          {/* Pending Review */}
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs transition-all hover:shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Pending Review
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300">
                <IconClock size={16} />
              </div>
            </div>
            <p className="font-display text-2xl sm:text-3xl font-bold text-amber-700 dark:text-amber-300 mt-3 tabular-nums">
              {pendingReviewCount}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {isPrivileged ? "Submitted by staff for sign-off" : "Awaiting executive review"}
            </p>
          </div>

          {/* Reviewed & Approved */}
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs transition-all hover:shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Reviewed &amp; Approved
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-300">
                <IconCheckCircle size={16} />
              </div>
            </div>
            <p className="font-display text-2xl sm:text-3xl font-bold text-blue-700 dark:text-blue-300 mt-3 tabular-nums">
              {reviewedCount}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">Governance sign-offs</p>
          </div>

          {/* In-Progress Drafts */}
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs transition-all hover:shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                In-Progress Drafts
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <IconCalendar size={16} />
              </div>
            </div>
            <p className="font-display text-2xl sm:text-3xl font-bold text-foreground mt-3 tabular-nums">
              {draftCount}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">Working drafts</p>
          </div>
        </div>

        {/* View Switcher (for CEO / Admin) */}
        {isPrivileged && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-3">
            <div className="inline-flex h-9 items-center rounded-lg bg-muted p-1 text-muted-foreground text-xs border border-border/60">
              <Link
                href="/dashboard?view=company"
                className={`rounded-md px-3 py-1 font-semibold transition-all ${
                  activeView === "company"
                    ? "bg-card text-foreground shadow-2xs"
                    : "hover:text-foreground"
                }`}
              >
                {isSuperAdmin ? "CEO Panoramic View (All Subsidiaries)" : "All Company Submissions"}
              </Link>
              <Link
                href="/dashboard?view=personal"
                className={`rounded-md px-3 py-1 font-semibold transition-all ${
                  isPersonalView
                    ? "bg-card text-foreground shadow-2xs"
                    : "hover:text-foreground"
                }`}
              >
                My Personal Reports
              </Link>
              <Link
                href="/dashboard?view=not_submitted"
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 font-semibold transition-all ${
                  isMissingView
                    ? "bg-card text-foreground shadow-2xs"
                    : "hover:text-foreground"
                }`}
              >
                <span>Not Submitted</span>
                {notSubmittedCount > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      isMissingView
                        ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {notSubmittedCount}
                  </span>
                )}
              </Link>
            </div>

            <span className="text-xs text-muted-foreground hidden sm:inline">
              Viewing{" "}
              {activeView === "company"
                ? "all subsidiary entities"
                : isMissingView
                ? `personnel with missing submissions (${notSubmittedCount} pending)`
                : "personal workspace"}
            </span>
          </div>
        )}

        {/* Registered Staff Weekly & Monthly Compliance Tracker (for CEO / Admin) */}
        {isPrivileged && (activeView === "company" || isMissingView) && staffList.length > 0 && (
          <StaffSubmissionTracker
            key={activeView}
            staffList={staffList}
            reports={allReportList}
            taskStats={taskStats}
            todayEthYmd={todayEthYmd}
            telegramBotConfigured={!!settings.telegram_bot_token}
            initialWarnings={allWarnings}
            initialComplianceFilter={isMissingView ? "missing_any" : "all"}
            highlightMissingOnly={isMissingView}
          />
        )}

        {/* Reports Table Section: hidden when in Not Submitted view */}
        {!isMissingView && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <IconFileText size={18} className="text-muted-foreground" />
                <span>
                  {isPrivileged && activeView === "company"
                    ? "Group Performance Submissions & Reviews"
                    : "Report Submissions & Records"}
                </span>
              </h2>
              <span className="text-xs text-muted-foreground font-mono tabular-nums">
                {reportList.length} records in view
              </span>
            </div>

            <DashboardReportsTable
              initialReports={reportList}
              showAuthor={isPrivileged && activeView === "company"}
              isPrivileged={isPrivileged}
              windowLocked={windowLocked}
            />
          </div>
        )}
      </div>
    </AppShell>
  );
}
