import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin" && user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const isSuperAdmin = user.role === "super_admin";
  const cid = user.company_id;

  const [users, reports, tasks, directives, comments, plans, files, warnings, activity, notices, settings] =
    isSuperAdmin
      ? await Promise.all([
          sql`SELECT id, company_id, email, full_name, department, role, telegram_username, telegram_linked_at, created_at FROM users ORDER BY created_at;`,
          sql`SELECT * FROM reports ORDER BY created_at;`,
          sql`SELECT * FROM tasks ORDER BY created_at;`,
          sql`SELECT * FROM directives ORDER BY created_at;`,
          sql`SELECT * FROM directive_comments ORDER BY created_at;`,
          sql`SELECT * FROM action_plans ORDER BY created_at;`,
          sql`SELECT * FROM uploaded_files ORDER BY created_at;`,
          sql`SELECT * FROM disciplinary_warnings ORDER BY created_at;`,
          sql`SELECT * FROM activity_log ORDER BY created_at;`,
          sql`SELECT * FROM notifications ORDER BY created_at;`,
          sql`SELECT company_id, window_mode, open_day, open_time, close_day, close_time, timezone, updated_by, updated_at, auto_warn_enabled, sla_response_days, system_name, letterhead_config, penalty_policy_verified FROM company_settings;`,
        ])
      : await Promise.all([
          sql`SELECT id, company_id, email, full_name, department, role, telegram_username, telegram_linked_at, created_at FROM users WHERE company_id = ${cid} ORDER BY created_at;`,
          sql`SELECT * FROM reports WHERE company_id = ${cid} ORDER BY created_at;`,
          sql`SELECT t.* FROM tasks t JOIN users u ON t.assigned_to = u.id WHERE u.company_id = ${cid} ORDER BY t.created_at;`,
          sql`SELECT d.* FROM directives d LEFT JOIN users u ON d.created_by = u.id WHERE u.company_id = ${cid} ORDER BY d.created_at;`,
          sql`SELECT c.* FROM directive_comments c JOIN users u ON c.user_id = u.id WHERE u.company_id = ${cid} ORDER BY c.created_at;`,
          sql`SELECT p.* FROM action_plans p JOIN users u ON p.user_id = u.id WHERE u.company_id = ${cid} ORDER BY p.created_at;`,
          sql`SELECT f.* FROM uploaded_files f LEFT JOIN users u ON f.uploaded_by = u.id WHERE u.company_id = ${cid} ORDER BY f.created_at;`,
          sql`SELECT w.* FROM disciplinary_warnings w JOIN users u ON w.user_id = u.id WHERE u.company_id = ${cid} ORDER BY w.created_at;`,
          sql`SELECT a.* FROM activity_log a LEFT JOIN users u ON a.actor_id = u.id WHERE u.company_id = ${cid} ORDER BY a.created_at;`,
          sql`SELECT n.* FROM notifications n JOIN users u ON n.user_id = u.id WHERE u.company_id = ${cid} ORDER BY n.created_at;`,
          sql`SELECT company_id, window_mode, open_day, open_time, close_day, close_time, timezone, updated_by, updated_at, auto_warn_enabled, sla_response_days, system_name, letterhead_config, penalty_policy_verified FROM company_settings WHERE company_id = ${cid};`,
        ]);

  const snapshot = {
    format: "yetaf-holding-portal-backup",
    schemaVersion: 2,
    scope: isSuperAdmin ? "all-companies" : cid,
    createdAt: new Date().toISOString(),
    createdBy: { id: user.id, email: user.email },
    data: { users, reports, tasks, directives, directiveComments: comments, actionPlans: plans, uploadedFiles: files, disciplinaryWarnings: warnings, activityLog: activity, notifications: notices, companySettings: settings },
  };
  const filename = `yetaf-portal-backup-${new Date().toISOString().slice(0, 10)}.json`;
  return new Response(JSON.stringify(snapshot), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
