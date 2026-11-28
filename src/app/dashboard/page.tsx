import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getPortalSettings } from "@/lib/portalSettings";
import { getWarningsList } from "@/lib/warnings";
import { evaluateReportingWindow, ETHIOPIA_TIMEZONE } from "@/lib/windowSchedule";
import { DashboardReportsTable } from "@/components/DashboardReportsTable";
import { ExecutiveSummaryTrigger } from "@/components/ExecutiveSummaryModal";
import { ReportingWindowBanner } from "@/components/ReportingWindowBanner";
import {
  StaffSubmissionTracker,
  type StaffTaskCounts,
  type TrackedStaffMember,
} from "@/components/StaffSubmissionTracker";
import { AppShell } from "@/components/AppShell";
import { TelegramConnectionBanner } from "@/components/TelegramConnectionBanner";
import { StatCard } from "@/components/StatCard";
import { StatusBoard } from "@/components/StatusBoard";
import {
  Button,
  Badge,
  Card,
} from "@/components/ui";
import {
  IconAlertCircle,
  IconBuilding,
  IconCheckCircle,
  IconCheckSquare,
  IconClock,
  IconCompass,
  IconCrown,
  IconDownload,
  IconLayers,
  IconLock,
  IconPlus,
  IconShield,
  IconTarget,
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

  // One global admin sees ALL companies. Staff are scoped to their own company.
  const viewerCompanyId = user.company_id ?? null;
  const viewerCompanyName = user.company_name ?? null;

  // View mode
  const activeView = params.view || (isPrivileged ? "company" : "personal");
  const isPersonalView = activeView === "personal";

  interface DbReportRow {
    id: string;
    company_id: string | null;
    company_name: string | null;
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

  // ── Query reports scoped by company for staff ──
  const rawReportRows = (isPrivileged
    ? await sql`
    SELECT r.id, r.company_id, c.name as company_name, r.user_id, r.report_type,
           to_char(r.period_start, 'YYYY-MM-DD') as period_start,
           to_char(r.period_end, 'YYYY-MM-DD') as period_end,
           r.status, r.data, r.review_notes, r.reviewed_by, r.reviewed_at,
           r.created_at, r.updated_at,
           u.full_name as author_name, u.department as author_department, u.email as author_email,
           rev.full_name as reviewer_name
    FROM reports r
    LEFT JOIN companies c ON r.company_id = c.id
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN users rev ON r.reviewed_by = rev.id
    ORDER BY r.created_at DESC;
  `
    : await sql`
    SELECT r.id, r.company_id, c.name as company_name, r.user_id, r.report_type,
           to_char(r.period_start, 'YYYY-MM-DD') as period_start,
           to_char(r.period_end, 'YYYY-MM-DD') as period_end,
           r.status, r.data, r.review_notes, r.reviewed_by, r.reviewed_at,
           r.created_at, r.updated_at,
           u.full_name as author_name, u.department as author_department, u.email as author_email,
           rev.full_name as reviewer_name
    FROM reports r
    LEFT JOIN companies c ON r.company_id = c.id
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN users rev ON r.reviewed_by = rev.id
    WHERE r.company_id = ${viewerCompanyId}
    ORDER BY r.created_at DESC;
  `) as DbReportRow[];

  const allReportList: ReportRow[] = rawReportRows.map((r) => ({
    id: r.id,
    company_id: r.company_id,
    company_name: r.company_name,
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

  // ── Staff scoped by company for staff users ──
  const staffRows = isPrivileged
    ? (await sql`
        SELECT id, full_name, email, department, role, company_id,
               telegram_chat_id
        FROM users
        ORDER BY full_name ASC;
      `)
    : (await sql`
        SELECT id, full_name, email, department, role, company_id,
               telegram_chat_id
        FROM users u
        WHERE u.company_id = ${viewerCompanyId}
        ORDER BY full_name ASC;
      `);

  const [
    settings,
    myOpenTasks,
    taskSummaryRows,
    allWarnings,
    myWarnings,
    overdueDirectivesRows,
    slaBreachesRows,
    kpiCountsRows,
    boardTaskRows,
    boardPlanRows,
  ] = await Promise.all([
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
          SELECT assigned_to,
                 COUNT(*) FILTER (WHERE status != 'completed')::int AS pending_tasks,
                 COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_tasks
          FROM tasks
          GROUP BY assigned_to;
        `
      : Promise.resolve([]),
    isPrivileged ? getWarningsList() : Promise.resolve([]),
    getWarningsList(user.id),
    sql`
      SELECT id, reference_code, title, department, priority, to_char(due_date, 'YYYY-MM-DD') as due_date
      FROM directives
      WHERE status != 'closed' AND due_date IS NOT NULL AND due_date < CURRENT_DATE
      ORDER BY due_date ASC
      LIMIT 4;
    `,
    sql`
      SELECT id, reference_code, title, department, priority, to_char(sla_due_at, 'YYYY-MM-DD HH24:MI') as sla_due_str
      FROM directives
      WHERE status = 'open' AND sla_due_at IS NOT NULL AND sla_due_at < NOW()
      ORDER BY sla_due_at ASC
      LIMIT 4;
    `,
    sql`
      SELECT
        (SELECT COUNT(*) FROM directives)::int AS total_directives,
        (SELECT COUNT(*) FROM directives WHERE status != 'closed')::int AS active_directives,
        (SELECT COUNT(*) FROM action_plans)::int AS total_plans,
        (SELECT COUNT(*) FROM action_plans WHERE status = 'submitted')::int AS submitted_plans,
        (SELECT COUNT(*) FROM tasks)::int AS total_tasks,
        (SELECT COUNT(*) FROM tasks WHERE status = 'completed')::int AS completed_tasks;
    `,
    isPrivileged ? sql`
      SELECT t.id, t.title, t.description, t.status,
             to_char(t.due_date, 'YYYY-MM-DD') as due_date,
             t.completion_note, u.full_name as assignee_name
      FROM tasks t LEFT JOIN users u ON u.id = t.assigned_to
      ORDER BY t.created_at DESC LIMIT 60;
    ` : Promise.resolve([]),
    isPrivileged ? sql`
      SELECT id, reference_code, title, department, status, summary, objectives
      FROM action_plans ORDER BY created_at DESC LIMIT 60;
    ` : Promise.resolve([]),
  ]);

  const activePersonalWarnings = (
    isPrivileged && !isPersonalView ? allWarnings : myWarnings
  ).filter((w) => w.status !== "revoked");
  const overdueDirectives = overdueDirectivesRows as {
    id: string;
    reference_code: string;
    title: string;
    department: string;
    priority: string;
    due_date: string;
  }[];
  const slaBreaches = slaBreachesRows as {
    id: string;
    reference_code: string;
    title: string;
    department: string;
    priority: string;
    sla_due_str: string;
  }[];
  const kpiCounts = (kpiCountsRows[0] || {
    total_directives: 0,
    active_directives: 0,
    total_plans: 0,
    submitted_plans: 0,
    total_tasks: 0,
    completed_tasks: 0,
  }) as {
    total_directives: number;
    active_directives: number;
    total_plans: number;
    submitted_plans: number;
    total_tasks: number;
    completed_tasks: number;
  };

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

  const totalCount = reportList.length;
  const pendingReviewCount = reportList.filter((r) => r.status === "submitted").length;
  const reviewedCount = reportList.filter((r) => r.status === "reviewed").length;

  const taskResolutionRate =
    kpiCounts.total_tasks > 0
      ? Math.round((kpiCounts.completed_tasks / kpiCounts.total_tasks) * 100)
      : 100;

  const totalPriorityIssues =
    overdueDirectives.length +
    slaBreaches.length +
    activePersonalWarnings.length;

  const displayName = user.full_name || user.email.split("@")[0] || "Executive";

  return (
    <AppShell
      user={user}
      title={isSuperAdmin ? "Direction Command Center" : "Report Follow-up Center"}
      subtitle={isSuperAdmin ? "Directive Follow-up System · Executive Status Board" : "Directive Follow-up System"}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* ── Executive Header ── */}
        <div
          className="relative isolate overflow-hidden"
          style={{ animationDelay: "0ms" }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-32 -z-10 h-96 w-96 rounded-full bg-brand/20 blur-[100px] animate-pulse-slow"
          />
          <div
            className={`relative isolate flex flex-col gap-5 border border-border bg-card shadow-sm ${isSuperAdmin ? "rounded-3xl p-5 sm:gap-7 sm:p-8 lg:p-10" : "rounded-3xl p-4 sm:p-6 lg:p-8"} fade-in-up`}
            style={{ animationDelay: "100ms" }}
          >
            <div className={`flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground ${isSuperAdmin ? "mb-4" : "mb-1.5"}`}>
              {isSuperAdmin ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-950 px-2.5 py-0.5 text-[11px] font-bold text-amber-300 ring-1 ring-amber-500/30">
                  <IconCrown size={12} className="text-amber-400" />
                  Office of Direction &amp; Board
                </span>
              ) : isAdmin ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-bold text-primary-foreground">
                  <IconShield size={12} />
                  Executive Administration
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-foreground border border-border">
                  <IconBuilding size={12} className="text-muted-foreground" />
                  {viewerCompanyName || "Operations"}
                </span>
              )}
              <span>&middot;</span>
              <span>DIRECTIVE FOLLOW-UP SYSTEM</span>
            </div>

            <h1 className={`font-display font-extrabold tracking-tight text-foreground ${isSuperAdmin ? "max-w-4xl text-3xl sm:text-4xl leading-[1.04] lg:text-5xl" : "text-2xl sm:text-3xl"}`}>
              {isSuperAdmin
                ? "Direction Follow-up"
                : isAdmin
                ? `Report Follow-up Center · ${displayName}`
                : `Welcome back, ${displayName}`}
            </h1>
            <p className={`mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base max-w-3xl`}>
              {isSuperAdmin
                ? "Panoramic group-wide oversight: Directives follow-up, action plans review, SLA accountability, and subsidiary reporting."
                : isAdmin
                ? "Manage directives, inspect department submissions, track SLA compliance, and supervise holding operations."
                : "Execute assigned directives, submit action plans, and file scheduled weekly & monthly performance reports."}
            </p>
          </div>

          <div className={`relative z-10 flex flex-wrap items-center gap-2 ${isSuperAdmin ? "border-t border-border/70 pt-4" : ""}`}>
            {isPrivileged && (
              <>
                <ExecutiveSummaryTrigger />

                <a
                  href="/api/reports/export/csv"
                  download
                  title="Download consolidated spreadsheet summary of all group submissions"
                >
                  <Button variant="outline" size="sm" leftIcon={<IconDownload size={14} />}>
                    Export CSV
                  </Button>
                </a>

                <Link href="/admin">
                  <Button variant="outline" size="sm" leftIcon={<IconUser size={14} />}>
                    Manage Users
                  </Button>
                </Link>
              </>
            )}

            {windowLocked ? (
              <span
                title={`Reporting closed. ${windowStatus.countdownLabel}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs font-semibold text-amber-800 dark:text-accent cursor-not-allowed"
              >
                <IconLock size={14} />
                Submissions Locked
              </span>
            ) : (
              <>
                <Link href="/reports/new/weekly">
                  <Button variant="outline" size="sm" leftIcon={<IconPlus size={14} />}>
                    New Weekly
                  </Button>
                </Link>

                <Link href="/reports/new/monthly">
                  <Button variant="primary" size="sm" leftIcon={<IconPlus size={14} />}>
                    New Monthly
                  </Button>
                </Link>
              </>
            )}

            <Link href="/directives">
              <Button variant="brand" size="sm" leftIcon={<IconCompass size={14} />}>
                Directives
              </Button>
            </Link>

            <Link href="/plans">
              <Button variant="outline" size="sm" leftIcon={<IconTarget size={14} />}>
                Action Plans
              </Button>
            </Link>

            <Link href="/tasks">
              <Button variant="outline" size="sm" leftIcon={<IconCheckSquare size={14} />}>
                Tasks{myOpenTasks.length > 0 ? ` (${myOpenTasks.length})` : ""}
              </Button>
            </Link>
          </div>
        </div>

        {/* ── Telegram Connection Required Banner ── */}
        {!user.telegram_chat_id && (
          <TelegramConnectionBanner connected={false} />
        )}

        {/* ── Priority Attention Zone ── */}
        <section
          aria-label="Priority Attention Zone"
          className="space-y-3 fade-in-up"
          style={{ animationDelay: "300ms" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-accent animate-pulse" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Priority Attention Zone
              </h2>
            </div>
            {totalPriorityIssues > 0 ? (
              <Badge variant="destructive" size="sm" pulse>
                {totalPriorityIssues} Priority Alert{totalPriorityIssues === 1 ? "" : "s"}
              </Badge>
            ) : (
              <Badge variant="success" size="sm">
                All Operations On Track
              </Badge>
            )}
          </div>

          {totalPriorityIssues === 0 ? (
            <Card className="border-emerald-500/30 bg-emerald-500/5 p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-brand">
                  <IconCheckCircle size={20} />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-foreground">
                    Zero SLA Breaches &middot; Zero Overdue Directives
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    All holding directives, action plans, and SLA response countdowns are currently healthy and compliant.
                  </p>
                </div>
                <Link href="/directives">
                  <Button variant="outline" size="xs">
                    Inspect Directives
                  </Button>
                </Link>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {overdueDirectives.length > 0 && (
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 dark:bg-red-500/15 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-500/20 text-red-700 dark:text-red-300">
                        <IconAlertCircle size={16} />
                      </div>
                      <h3 className="text-xs font-bold text-accent-strong dark:text-accent">
                        {overdueDirectives.length} Overdue Directive{overdueDirectives.length === 1 ? "" : "s"}
                      </h3>
                    </div>
                    <Badge variant="destructive" size="sm">Critical</Badge>
                  </div>
                  <div className="space-y-1.5">
                    {overdueDirectives.slice(0, 2).map((d) => (
                      <Link
                        key={d.id}
                        href={`/directives/${d.id}`}
                        className="flex items-center justify-between gap-2 rounded-lg bg-card/80 p-2 text-xs hover:bg-card transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{d.title}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {d.reference_code} &middot; {d.department}
                          </p>
                        </div>
                        <span className="text-[10px] font-mono text-destructive shrink-0">
                          Due {d.due_date}
                        </span>
                      </Link>
                    ))}
                  </div>
                  <Link href="/directives" className="block text-right">
                    <Button variant="destructive" size="xs">
                      Resolve Directives &rarr;
                    </Button>
                  </Link>
                </div>
              )}

              {slaBreaches.length > 0 && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 dark:bg-amber-500/15 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300">
                        <IconClock size={16} />
                      </div>
                      <h3 className="text-xs font-bold text-accent-strong dark:text-accent">
                        {slaBreaches.length} SLA Response Breach{slaBreaches.length === 1 ? "" : "es"}
                      </h3>
                    </div>
                    <Badge variant="warning" size="sm">SLA Warning</Badge>
                  </div>
                  <div className="space-y-1.5">
                    {slaBreaches.slice(0, 2).map((d) => (
                      <Link
                        key={d.id}
                        href={`/directives/${d.id}`}
                        className="flex items-center justify-between gap-2 rounded-lg bg-card/80 p-2 text-xs hover:bg-card transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{d.title}</p>
                          <p className="text-[10px] text-muted-foreground">{d.department}</p>
                        </div>
                        <span className="text-[10px] font-mono text-amber-800 dark:text-accent shrink-0">
                          Breached {d.sla_due_str}
                        </span>
                      </Link>
                    ))}
                  </div>
                  <Link href="/directives" className="block text-right">
                    <Button variant="brand" size="xs">
                      Enforce Action Plan &rarr;
                    </Button>
                  </Link>
                </div>
              )}

              {activePersonalWarnings.length > 0 && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 dark:bg-rose-500/15 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-500/20 text-rose-700 dark:text-rose-300">
                        <IconAlertCircle size={16} />
                      </div>
                      <h3 className="text-xs font-bold text-accent-strong dark:text-accent">
                        {activePersonalWarnings.length} Active Warning Notice
                      </h3>
                    </div>
                    <Badge variant="destructive" size="sm">Attention</Badge>
                  </div>
                  <div className="space-y-1.5">
                    {activePersonalWarnings.slice(0, 2).map((w) => (
                      <Link
                        key={w.id}
                        href={`/warnings/${w.id}`}
                        className="flex items-center justify-between gap-2 rounded-lg bg-card/80 p-2 text-xs hover:bg-card transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">
                            {w.report_type === "monthly" ? "Monthly" : "Weekly"} Filing
                          </p>
                          <p className="text-[10px] text-muted-foreground">{w.period_label}</p>
                        </div>
                        <span className="text-[10px] font-semibold text-rose-700 dark:text-rose-300 shrink-0">
                          Strike #{w.strike_number}
                        </span>
                      </Link>
                    ))}
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/warnings/${activePersonalWarnings[0].id}`}>
                      <Button variant="destructive" size="xs">
                        Acknowledge &rarr;
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── KPI Stat Cards ── */}
        <section
          aria-label="Key Performance Indicators"
          className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 fade-in-up"
          style={{ animationDelay: "200ms" }}
        >
          <StatCard
            title="Active Directives"
            value={kpiCounts.active_directives}
            caption={`${kpiCounts.total_directives} total strategic issued`}
            icon={
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
                <IconCompass size={16} />
              </div>
            }
          />

          <StatCard
            title="Action Plans"
            value={kpiCounts.submitted_plans}
            caption={`${kpiCounts.total_plans} total division commitments`}
            icon={
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-brand">
                <IconTarget size={16} />
              </div>
            }
          />

          <StatCard
            title="Task Resolution"
            value={taskResolutionRate + "%"}
            caption={`${kpiCounts.completed_tasks} completed · ${kpiCounts.total_tasks - kpiCounts.completed_tasks} open`}
            icon={
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <IconCheckSquare size={16} />
              </div>
            }
          />

          <StatCard
            title="Governance Filings"
            value={totalCount}
            caption={`${reviewedCount} approved · ${pendingReviewCount} in review`}
            icon={
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <IconLayers size={16} />
              </div>
            }
          />
        </section>

        {/* ── Reporting Window ── */}
        <div className="fade-in-up" style={{ animationDelay: "400ms" }}>
          <ReportingWindowBanner status={windowStatus} isPrivileged={isPrivileged} />
        </div>

        {/* ── Executive Status Board (widget grid) ── */}
        {isPrivileged && (
          <div className="fade-in-up" style={{ animationDelay: "450ms" }}>
            <StatusBoard
              reports={allReportList}
              tasks={boardTaskRows as { id: string; title: string; description: string; status: string; due_date: string | null; completion_note: string | null; assignee_name: string | null }[]}
              plans={boardPlanRows as { id: string; reference_code: string; title: string; department: string; status: string; summary: string | null; objectives: { activity?: string; status?: string; progress?: number }[] }[]}
            />
          </div>
        )}

        {/* ── Staff Submission Tracker ── */}
        {isPrivileged && (
          <div className="fade-in-up" style={{ animationDelay: "500ms" }}>
            <div className="space-y-4">
              <StaffSubmissionTracker
                staffList={staffList}
                reports={allReportList}
                taskStats={taskStats}
                todayEthYmd={todayEthYmd}
                highlightMissingOnly={activeView === "not_submitted"}
              />
            </div>
          </div>
        )}

        {/* ── Reports Archive Table ── */}
        <div className="fade-in-up" style={{ animationDelay: "550ms" }}>
          <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                {isPersonalView ? "My Performance Submissions" : "Holding Filings Archive"}
              </h2>
              <p className="text-xs text-muted-foreground">
                Review, filter, inspect, and export corporate governance submissions.
              </p>
            </div>
          </div>

          <DashboardReportsTable
            initialReports={reportList}
            showAuthor={isPrivileged && !isPersonalView}
            isPrivileged={isPrivileged}
            windowLocked={windowLocked}
          />
        </div>
        </div>
      </div>
    </AppShell>
  );
}
