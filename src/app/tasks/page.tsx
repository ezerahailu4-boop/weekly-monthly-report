import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { AppShell } from "@/components/AppShell";
import { TaskWorkspace, type AssignableUser } from "@/components/TaskWorkspace";
import { ETHIOPIA_TIMEZONE } from "@/lib/windowSchedule";
import type { TaskRow } from "@/types/task";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const isPrivileged = user.role === "admin" || user.role === "super_admin";

  const [taskRows, userRows] = await Promise.all([
    isPrivileged
      ? sql`
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
        `
      : sql`
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
          WHERE t.assigned_to = ${user.id}
          ORDER BY
            CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END ASC,
            t.due_date ASC NULLS LAST,
            t.created_at DESC;
        `,
    isPrivileged
      ? sql`
          SELECT id, full_name, email, department, role, telegram_chat_id
          FROM users
          ORDER BY full_name ASC;
        `
      : Promise.resolve([]),
  ]);

  const tasks: TaskRow[] = taskRows.map((t) => ({
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

  const users: AssignableUser[] = userRows.map((u) => ({
    id: u.id,
    full_name: u.full_name,
    email: u.email,
    department: u.department,
    role: u.role,
    telegram_chat_id: u.telegram_chat_id ?? null,
  }));

  const todayEthDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: ETHIOPIA_TIMEZONE,
  }).format(new Date());

  return (
    <AppShell
      user={user}
      title={isPrivileged ? "Tasks & Telegram Alerts" : "My Assigned Tasks"}
      subtitle="Action Items & Completion Tracking"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <div className="border-b border-border pb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            YETAF HOLDING · Operations &amp; Follow-up
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            {isPrivileged ? "Task Assignment & Tracking" : "My Assigned Tasks"}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-2xl">
            {isPrivileged
              ? "Assign operational tasks to registered personnel with instant Telegram notifications and track completion progress."
              : "View directives assigned to you by management, update progress, and mark tasks as completed."}
          </p>
        </div>

        <TaskWorkspace
          initialTasks={tasks}
          users={users}
          currentUserId={user.id}
          isPrivileged={isPrivileged}
          todayEthDate={todayEthDate}
          showTelegramCard={true}
        />
      </div>
    </AppShell>
  );
}

