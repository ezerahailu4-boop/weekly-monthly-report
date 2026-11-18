import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getPortalSettings } from "@/lib/portalSettings";
import { AppShell } from "@/components/AppShell";
import { DirectivesWorkspace } from "@/components/DirectivesWorkspace";
import type { DirectiveRow } from "@/types/directive";
import type { AssignableUser } from "@/components/TaskWorkspace";

export const dynamic = "force-dynamic";

export default async function DirectivesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const isPrivileged = user.role === "admin" || user.role === "super_admin";

  const [settings, directiveRows, userRows] = await Promise.all([
    getPortalSettings(),
    isPrivileged
      ? sql`
          SELECT d.id, d.reference_code, d.title, d.department, d.priority,
                 d.directions, d.executive_summary, d.entry_mode, d.attachments,
                 d.status, to_char(d.due_date, 'YYYY-MM-DD') as due_date,
                 d.sla_days, d.last_comment_at, d.sla_due_at, d.source_report_id,
                 d.created_by, d.created_at, d.updated_at,
                 u.full_name as created_by_name,
                 (SELECT COUNT(*)::int FROM tasks t WHERE t.directive_id = d.id) as total_tasks,
                 (SELECT COUNT(*)::int FROM tasks t WHERE t.directive_id = d.id AND t.status = 'completed') as completed_tasks,
                 (SELECT COUNT(*)::int FROM directive_comments c WHERE c.directive_id = d.id) as comment_count
          FROM directives d
          LEFT JOIN users u ON d.created_by = u.id
          ORDER BY d.created_at DESC;
        `
      : sql`
          SELECT d.id, d.reference_code, d.title, d.department, d.priority,
                 d.directions, d.executive_summary, d.entry_mode, d.attachments,
                 d.status, to_char(d.due_date, 'YYYY-MM-DD') as due_date,
                 d.sla_days, d.last_comment_at, d.sla_due_at, d.source_report_id,
                 d.created_by, d.created_at, d.updated_at,
                 u.full_name as created_by_name,
                 (SELECT COUNT(*)::int FROM tasks t WHERE t.directive_id = d.id) as total_tasks,
                 (SELECT COUNT(*)::int FROM tasks t WHERE t.directive_id = d.id AND t.status = 'completed') as completed_tasks,
                 (SELECT COUNT(*)::int FROM directive_comments c WHERE c.directive_id = d.id) as comment_count
          FROM directives d
          LEFT JOIN users u ON d.created_by = u.id
          WHERE d.department = 'All Departments'
             OR d.department = ${user.department}
             OR d.created_by = ${user.id}
             OR EXISTS (
               SELECT 1 FROM tasks t WHERE t.directive_id = d.id AND t.assigned_to = ${user.id}
             )
          ORDER BY d.created_at DESC;
        `,
    isPrivileged
      ? sql`
          SELECT id, full_name, email, department, role, telegram_chat_id
          FROM users
          ORDER BY full_name ASC;
        `
      : Promise.resolve([]),
  ]);

  const directives: DirectiveRow[] = directiveRows.map((d) => ({
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
    sla_days: Number(d.sla_days || settings.sla_response_days),
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
    total_tasks: Number(d.total_tasks || 0),
    completed_tasks: Number(d.completed_tasks || 0),
    comment_count: Number(d.comment_count || 0),
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
      title="Directive Follow-up Center"
      subtitle="Track Direction mandates, AI summaries, concurrent tasks & SLA discussions"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <div className="border-b border-border pb-5">
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Directive Follow-up System
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-3xl">
            Issue corporate directions with automated AI summarization, assign multiple concurrent follow-up tasks per directive, and enforce SLA response countdowns through contextual discussion threads.
          </p>
        </div>

        <DirectivesWorkspace
          initialDirectives={directives}
          users={users}
          isPrivileged={isPrivileged}
          defaultSlaDays={settings.sla_response_days}
          initialNowIso={new Date().toISOString()}
        />
      </div>
    </AppShell>
  );
}

