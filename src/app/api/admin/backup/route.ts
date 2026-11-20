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

  const [users, reports, tasks, directives, comments, plans, files, warnings, activity, notices, settings] = await Promise.all([
    sql`SELECT id, email, full_name, department, role, telegram_username, telegram_linked_at, created_at FROM users ORDER BY created_at;`,
    sql`SELECT * FROM reports ORDER BY created_at;`,
    sql`SELECT * FROM tasks ORDER BY created_at;`,
    sql`SELECT * FROM directives ORDER BY created_at;`,
    sql`SELECT * FROM directive_comments ORDER BY created_at;`,
    sql`SELECT * FROM action_plans ORDER BY created_at;`,
    sql`SELECT * FROM uploaded_files ORDER BY created_at;`,
    sql`SELECT * FROM disciplinary_warnings ORDER BY created_at;`,
    sql`SELECT * FROM activity_log ORDER BY created_at;`,
    sql`SELECT * FROM notifications ORDER BY created_at;`,
    sql`SELECT id, window_mode, open_day, open_time, close_day, close_time, timezone, updated_by, updated_at, auto_warn_enabled, sla_response_days, system_name, letterhead_config, penalty_policy_verified FROM portal_settings;`,
  ]);

  const snapshot = {
    format: "yetaf-holding-portal-backup",
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    createdBy: { id: user.id, email: user.email },
    data: { users, reports, tasks, directives, directiveComments: comments, actionPlans: plans, uploadedFiles: files, disciplinaryWarnings: warnings, activityLog: activity, notifications: notices, portalSettings: settings },
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
