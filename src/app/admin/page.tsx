import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getPortalSettings } from "@/lib/portalSettings";
import { getWarningsList } from "@/lib/warnings";
import { ETHIOPIA_TIMEZONE } from "@/lib/windowSchedule";
import { AdminUserManagement, type TeamMember } from "@/components/AdminUserManagement";
import { AdminWindowSettings } from "@/components/AdminWindowSettings";
import { DashboardReportsTable } from "@/components/DashboardReportsTable";
import {
  StaffSubmissionTracker,
  type StaffTaskCounts,
} from "@/components/StaffSubmissionTracker";
import { TaskWorkspace, type AssignableUser } from "@/components/TaskWorkspace";
import { AppShell } from "@/components/AppShell";
import {
  IconCheckSquare,
  IconCrown,
  IconFileText,
  IconShield,
  IconSliders,
  IconUser,
} from "@/components/Icons";
import type { ReportRow } from "@/types/report";
import type { TaskRow } from "@/types/task";

export const dynamic = "force-dynamic";

function maskToken(token: string | null): string | null {
  if (!token) return null;
  if (token.length <= 12) return "••••••••";
  return `${token.slice(0, 6)}••••••${token.slice(-4)}`;
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
  }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const isSuperAdmin = user.role === "super_admin";
  const isAdmin = user.role === "admin";
  if (!isAdmin && !isSuperAdmin) redirect("/dashboard");

  const params = await searchParams;
  const activeTab =
    params.tab === "reports" ||
    params.tab === "tasks" ||
    params.tab === "settings"
      ? params.tab
      : "team";

  // Query team members, reports, tasks, settings, and warnings in parallel from Neon
  const [teamRows, reportRows, taskRows, settings, allWarnings] = await Promise.all([
    sql`
      SELECT id, email, full_name, department, role,
             telegram_chat_id, telegram_username, created_at
      FROM users
      ORDER BY created_at DESC;
    `,
    sql`
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
    `,
    sql`
      SELECT t.id, t.title, t.description, t.assigned_to, t.assigned_by,
             t.status, t.priority, to_char(t.due_date, 'YYYY-MM-DD') as due_date,
             t.completion_note, t.completed_at, t.telegram_notified_at, t.telegram_error,
             t.created_at, t.updated_at,
             u.full_name as assignee_name, u.email as assignee_email,
             u.department as assignee_department, u.telegram_chat_id as assignee_telegram_chat_id,
             ab.full_name as assigned_by_name
      FROM tasks t
      JOIN users u ON t.assigned_to = u.id
      LEFT JOIN users ab ON t.assigned_by = ab.id
      ORDER BY
        CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END ASC,
        t.due_date ASC NULLS LAST,
        t.created_at DESC;
    `,
    getPortalSettings(),
    getWarningsList(),
  ]);

  const allReports: ReportRow[] = reportRows.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    report_type: r.report_type,
    period_start: r.period_start,
    period_end: r.period_end,
    status: r.status,
    data: r.data,
    created_at:
      typeof r.created_at === "string" ? r.created_at : r.created_at.toISOString(),
    updated_at:
      typeof r.updated_at === "string" ? r.updated_at : r.updated_at.toISOString(),
    author_name: r.author_name,
    author_department: r.author_department,
    author_email: r.author_email,
    review_notes: r.review_notes,
    reviewed_by: r.reviewed_by,
    reviewed_at: r.reviewed_at
      ? typeof r.reviewed_at === "string"
        ? r.reviewed_at
        : r.reviewed_at.toISOString()
      : null,
    reviewer_name: r.reviewer_name,
    profiles: {
      full_name: r.author_name,
      department: r.author_department,
    },
  }));

  const teamList: TeamMember[] = teamRows.map((t) => ({
    id: t.id,
    email: t.email,
    full_name: t.full_name,
    department: t.department,
    role: t.role as "employee" | "admin" | "super_admin",
    telegram_chat_id: t.telegram_chat_id ?? null,
    telegram_username: t.telegram_username ?? null,
    created_at:
      typeof t.created_at === "string" ? t.created_at : t.created_at.toISOString(),
  }));

  const assignableUsers: AssignableUser[] = teamRows.map((t) => ({
    id: t.id,
    full_name: t.full_name,
    email: t.email,
    department: t.department,
    role: t.role,
    telegram_chat_id: t.telegram_chat_id ?? null,
  }));

  const allTasks: TaskRow[] = taskRows.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description || "",
    assigned_to: t.assigned_to,
    assigned_by: t.assigned_by,
    status: t.status,
    priority: t.priority,
    due_date: t.due_date,
    completion_note: t.completion_note,
    completed_at: t.completed_at
      ? typeof t.completed_at === "string"
        ? t.completed_at
        : t.completed_at.toISOString()
      : null,
    telegram_notified_at: t.telegram_notified_at
      ? typeof t.telegram_notified_at === "string"
        ? t.telegram_notified_at
        : t.telegram_notified_at.toISOString()
      : null,
    telegram_error: t.telegram_error,
    created_at:
      typeof t.created_at === "string" ? t.created_at : t.created_at.toISOString(),
    updated_at:
      typeof t.updated_at === "string" ? t.updated_at : t.updated_at.toISOString(),
    assignee_name: t.assignee_name,
    assignee_email: t.assignee_email,
    assignee_department: t.assignee_department,
    assignee_telegram_chat_id: t.assignee_telegram_chat_id,
    assigned_by_name: t.assigned_by_name,
  }));

  const todayEthDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: ETHIOPIA_TIMEZONE,
  }).format(new Date());

  const taskStats: Record<string, StaffTaskCounts> = {};
  for (const t of allTasks) {
    if (!taskStats[t.assigned_to]) {
      taskStats[t.assigned_to] = { pending: 0, completed: 0 };
    }
    if (t.status === "completed") {
      taskStats[t.assigned_to].completed += 1;
    } else {
      taskStats[t.assigned_to].pending += 1;
    }
  }

  return (
    <AppShell
      user={user}
      title={isSuperAdmin ? "CEO Governance Console" : "Admin Console"}
      subtitle="Users, Tasks, Reporting Window & Telegram"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-3 border-b border-border pb-6">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {isSuperAdmin ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-950 px-2.5 py-0.5 text-[11px] font-bold text-amber-300 ring-1 ring-amber-500/30">
                <IconCrown size={12} className="text-amber-400" />
                Office of the CEO &amp; Board
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-bold text-primary-foreground">
                <IconShield size={12} />
                Executive Administration
              </span>
            )}
            <span>&middot;</span>
            <span>Corporate Governance, Schedule &amp; Tasks</span>
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            {isSuperAdmin
              ? "CEO Executive Governance Console"
              : "Administrator Governance Console"}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-3xl">
            {isSuperAdmin
              ? "Oversee user accounts, assign tasks with Telegram alerts, customize Ethiopian Time submission windows, and review subsidiary reports."
              : "Manage staff accounts, assign tasks with Telegram notifications, configure Ethiopian Time reporting hours, and review submissions."}
          </p>

          {/* Segmented Tab Control */}
          <div className="mt-4 flex flex-wrap items-center gap-1 rounded-lg bg-muted p-1 text-muted-foreground text-xs w-fit border border-border/60">
            <Link
              href="/admin?tab=team"
              className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 font-semibold transition-all ${
                activeTab === "team"
                  ? "bg-card text-foreground shadow-2xs"
                  : "hover:text-foreground"
              }`}
            >
              <IconUser size={14} />
              <span>Users ({teamList.length})</span>
            </Link>

            <Link
              href="/admin?tab=tasks"
              className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 font-semibold transition-all ${
                activeTab === "tasks"
                  ? "bg-card text-foreground shadow-2xs"
                  : "hover:text-foreground"
              }`}
            >
              <IconCheckSquare size={14} />
              <span>Tasks ({allTasks.length})</span>
            </Link>

            <Link
              href="/admin?tab=settings"
              className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 font-semibold transition-all ${
                activeTab === "settings"
                  ? "bg-card text-foreground shadow-2xs"
                  : "hover:text-foreground"
              }`}
            >
              <IconSliders size={14} />
              <span>Window &amp; Telegram</span>
            </Link>

            <Link
              href="/admin?tab=reports"
              className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 font-semibold transition-all ${
                activeTab === "reports"
                  ? "bg-card text-foreground shadow-2xs"
                  : "hover:text-foreground"
              }`}
            >
              <IconFileText size={14} />
              <span>Reports ({allReports.length})</span>
            </Link>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "team" && (
          <AdminUserManagement initialTeam={teamList} currentUserRole={user.role} />
        )}

        {activeTab === "tasks" && (
          <TaskWorkspace
            initialTasks={allTasks}
            users={assignableUsers}
            currentUserId={user.id}
            isPrivileged={true}
            todayEthDate={todayEthDate}
            showTelegramCard={false}
          />
        )}

        {activeTab === "settings" && (
          <AdminWindowSettings
            initialConfig={{
              window_mode: settings.window_mode,
              open_day: settings.open_day,
              open_time: settings.open_time,
              close_day: settings.close_day,
              close_time: settings.close_time,
              timezone: settings.timezone,
            }}
            initialAutoWarnEnabled={settings.auto_warn_enabled}
            initialTelegram={{
              configured: !!settings.telegram_bot_token,
              botUsername: settings.telegram_bot_username,
              maskedToken: maskToken(settings.telegram_bot_token),
              envOverride: !!process.env.TELEGRAM_BOT_TOKEN,
            }}
          />
        )}

        {activeTab === "reports" && (
          <div className="space-y-6">
            <StaffSubmissionTracker
              staffList={teamList.map((m) => ({
                id: m.id,
                full_name: m.full_name,
                email: m.email || "",
                department: m.department,
                role: m.role,
                telegram_chat_id: m.telegram_chat_id ?? null,
              }))}
              reports={allReports}
              taskStats={taskStats}
              todayEthYmd={todayEthDate}
              telegramBotConfigured={!!settings.telegram_bot_token}
              initialWarnings={allWarnings}
            />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <IconFileText size={18} className="text-muted-foreground" />
                  <span>All Group Submissions &amp; Reports</span>
                </h2>
                <span className="text-xs text-muted-foreground font-mono tabular-nums">
                  {allReports.length} records available
                </span>
              </div>

              <DashboardReportsTable
                initialReports={allReports}
                showAuthor={true}
                isPrivileged={true}
              />
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
