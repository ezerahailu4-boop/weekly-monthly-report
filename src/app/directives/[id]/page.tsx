import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { AppShell } from "@/components/AppShell";
import { DirectiveDetailView } from "@/components/DirectiveDetailView";
import type { DirectiveCommentRow, DirectiveRow } from "@/types/directive";
import type { TaskRow } from "@/types/task";
import type { AssignableUser } from "@/components/TaskWorkspace";

export const dynamic = "force-dynamic";

export default async function DirectiveDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const isPrivileged = user.role === "admin" || user.role === "super_admin";

  const [dirRows, taskRows, commentRows, planRows, userRows] = await Promise.all([
    sql`
      SELECT d.id, d.reference_code, d.title, d.department, d.priority,
             d.directions, d.executive_summary, d.entry_mode, d.attachments,
             d.status, to_char(d.due_date, 'YYYY-MM-DD') as due_date,
             d.sla_days, d.last_comment_at, d.sla_due_at, d.source_report_id,
             d.created_by, d.created_at, d.updated_at,
             u.full_name as created_by_name
      FROM directives d
      LEFT JOIN users u ON d.created_by = u.id
      WHERE d.id = ${id}
      LIMIT 1;
    `,
    sql`
      SELECT t.id, t.title, t.description, t.assigned_to, t.assigned_by, t.directive_id,
             t.status, t.priority, to_char(t.due_date, 'YYYY-MM-DD') as due_date,
             t.completion_note, t.completed_at, t.telegram_notified_at, t.telegram_error,
             t.created_at, t.updated_at,
             u.full_name as assignee_name, u.email as assignee_email,
             u.department as assignee_department, u.telegram_chat_id as assignee_telegram_chat_id,
             ab.full_name as assigned_by_name
      FROM tasks t
      JOIN users u ON t.assigned_to = u.id
      LEFT JOIN users ab ON t.assigned_by = ab.id
      WHERE t.directive_id = ${id}
      ORDER BY
        CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END ASC,
        t.due_date ASC NULLS LAST,
        t.created_at DESC;
    `,
    sql`
      SELECT c.id, c.directive_id, c.user_id, c.message, c.attachment,
             c.requires_response, c.sla_deadline_at, c.responded_at, c.created_at,
             u.full_name as author_name, u.role as author_role, u.department as author_department
      FROM directive_comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.directive_id = ${id}
      ORDER BY c.created_at ASC;
    `,
    sql`
      SELECT p.id, p.reference_code, p.title, p.department, p.status,
             to_char(p.period_start, 'YYYY-MM-DD') as period_start,
             to_char(p.period_end, 'YYYY-MM-DD') as period_end,
             u.full_name as author_name
      FROM action_plans p
      JOIN users u ON p.user_id = u.id
      WHERE p.directive_id = ${id}
      ORDER BY p.created_at DESC;
    `,
    isPrivileged
      ? sql`
          SELECT id, full_name, email, department, role, telegram_chat_id
          FROM users
          ORDER BY full_name ASC;
        `
      : Promise.resolve([]),
  ]);

  if (dirRows.length === 0) notFound();

  const d = dirRows[0];
  const directive: DirectiveRow = {
    id: String(d.id),
    reference_code: String(d.reference_code),
    title: String(d.title),
    department: String(d.department),
    priority: d.priority as DirectiveRow["priority"],
    directions: Array.isArray(d.directions) ? d.directions : [],
    executive_summary: String(d.executive_summary || ""),
    entry_mode: (d.entry_mode === "upload" ? "upload" : "form") as DirectiveRow["entry_mode"],
    attachments: Array.isArray(d.attachments) ? d.attachments : [],
    status: d.status as DirectiveRow["status"],
    due_date: d.due_date ? String(d.due_date) : null,
    sla_days: Number(d.sla_days || 3),
    last_comment_at: d.last_comment_at
      ? typeof d.last_comment_at === "string"
        ? d.last_comment_at
        : d.last_comment_at.toISOString()
      : null,
    sla_due_at: d.sla_due_at
      ? typeof d.sla_due_at === "string"
        ? d.sla_due_at
        : d.sla_due_at.toISOString()
      : null,
    source_report_id: d.source_report_id ? String(d.source_report_id) : null,
    created_by: d.created_by ? String(d.created_by) : null,
    created_by_name: d.created_by_name ? String(d.created_by_name) : null,
    created_at:
      typeof d.created_at === "string" ? d.created_at : d.created_at.toISOString(),
    updated_at:
      typeof d.updated_at === "string" ? d.updated_at : d.updated_at.toISOString(),
  };

  const tasks: TaskRow[] = taskRows.map((t) => ({
    id: String(t.id),
    title: String(t.title),
    description: String(t.description || ""),
    assigned_to: String(t.assigned_to),
    assigned_by: t.assigned_by ? String(t.assigned_by) : null,
    directive_id: t.directive_id ? String(t.directive_id) : null,
    status: t.status as TaskRow["status"],
    priority: t.priority as TaskRow["priority"],
    due_date: t.due_date ? String(t.due_date) : null,
    completion_note: t.completion_note ? String(t.completion_note) : null,
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
    telegram_error: t.telegram_error ? String(t.telegram_error) : null,
    created_at:
      typeof t.created_at === "string" ? t.created_at : t.created_at.toISOString(),
    updated_at:
      typeof t.updated_at === "string" ? t.updated_at : t.updated_at.toISOString(),
    assignee_name: t.assignee_name ? String(t.assignee_name) : null,
    assignee_email: t.assignee_email ? String(t.assignee_email) : null,
    assignee_department: t.assignee_department ? String(t.assignee_department) : null,
    assignee_telegram_chat_id: t.assignee_telegram_chat_id
      ? String(t.assignee_telegram_chat_id)
      : null,
    assigned_by_name: t.assigned_by_name ? String(t.assigned_by_name) : null,
  }));

  const comments: DirectiveCommentRow[] = commentRows.map((c) => ({
    id: String(c.id),
    directive_id: String(c.directive_id),
    user_id: String(c.user_id),
    author_name: String(c.author_name || "Team Member"),
    author_role: c.author_role as DirectiveCommentRow["author_role"],
    author_department: c.author_department ? String(c.author_department) : null,
    message: String(c.message),
    attachment: c.attachment || null,
    requires_response: Boolean(c.requires_response),
    sla_deadline_at: c.sla_deadline_at
      ? typeof c.sla_deadline_at === "string"
        ? c.sla_deadline_at
        : c.sla_deadline_at.toISOString()
      : null,
    responded_at: c.responded_at
      ? typeof c.responded_at === "string"
        ? c.responded_at
        : c.responded_at.toISOString()
      : null,
    created_at:
      typeof c.created_at === "string" ? c.created_at : c.created_at.toISOString(),
  }));

  const linkedPlans = planRows.map((p) => ({
    id: String(p.id),
    reference_code: String(p.reference_code),
    title: String(p.title),
    department: String(p.department),
    status: String(p.status),
    period_start: String(p.period_start),
    period_end: String(p.period_end),
    author_name: String(p.author_name || "Staff"),
  }));

  const users: AssignableUser[] = userRows.map((u) => ({
    id: String(u.id),
    full_name: String(u.full_name || u.email),
    email: String(u.email),
    department: String(u.department || "Operations & Logistics"),
    role: String(u.role),
    telegram_chat_id: u.telegram_chat_id ? String(u.telegram_chat_id) : null,
  }));

  return (
    <AppShell
      user={user}
      title={directive.reference_code}
      subtitle="Directive Follow-up & Collaboration"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <DirectiveDetailView
          initialDirective={directive}
          initialTasks={tasks}
          initialComments={comments}
          linkedPlans={linkedPlans}
          users={users}
          currentUserId={user.id}
          isPrivileged={isPrivileged}
          initialNowIso={new Date().toISOString()}
        />
      </div>
    </AppShell>
  );
}

