import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getPortalSettings } from "@/lib/portalSettings";

async function authorizeErpRequest(request: Request): Promise<boolean> {
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    const settings = await getPortalSettings();
    if (settings.erp_api_key && token === settings.erp_api_key) {
      return true;
    }
  }
  const user = await getCurrentUser();
  return !!user && (user.role === "admin" || user.role === "super_admin");
}

/**
 * GET /api/erp/v1/export?entity=all|directives|plans|tasks|reports&since=YYYY-MM-DD
 * Clean RESTful export endpoint for seamless ERP synchronization.
 */
export async function GET(request: Request) {
  const ok = await authorizeErpRequest(request);
  if (!ok) {
    return NextResponse.json(
      { error: "Unauthorized: Provide a valid ERP Bearer API key or Admin session." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const entity = searchParams.get("entity") || "all";

  const [directives, plans, tasks, reports] = await Promise.all([
    entity === "all" || entity === "directives"
      ? sql`
          SELECT d.id, d.reference_code, d.title, d.department, d.priority,
                 d.directions, d.executive_summary, d.entry_mode, d.status,
                 to_char(d.due_date, 'YYYY-MM-DD') as due_date,
                 d.sla_days, d.sla_due_at, d.created_at, d.updated_at
          FROM directives d
          ORDER BY d.updated_at DESC
          LIMIT 250;
        `
      : Promise.resolve([]),
    entity === "all" || entity === "plans"
      ? sql`
          SELECT p.id, p.reference_code, p.directive_id, p.title, p.department,
                 to_char(p.period_start, 'YYYY-MM-DD') as period_start,
                 to_char(p.period_end, 'YYYY-MM-DD') as period_end,
                 p.entry_mode, p.objectives, p.summary, p.status,
                 u.email as author_email, p.created_at, p.updated_at
          FROM action_plans p
          JOIN users u ON p.user_id = u.id
          ORDER BY p.updated_at DESC
          LIMIT 250;
        `
      : Promise.resolve([]),
    entity === "all" || entity === "tasks"
      ? sql`
          SELECT t.id, t.directive_id, t.title, t.description, t.status, t.priority,
                 to_char(t.due_date, 'YYYY-MM-DD') as due_date,
                 u.email as assignee_email, u.department as assignee_department,
                 t.completed_at, t.created_at, t.updated_at
          FROM tasks t
          JOIN users u ON t.assigned_to = u.id
          ORDER BY t.updated_at DESC
          LIMIT 250;
        `
      : Promise.resolve([]),
    entity === "all" || entity === "reports"
      ? sql`
          SELECT r.id, r.report_type,
                 to_char(r.period_start, 'YYYY-MM-DD') as period_start,
                 to_char(r.period_end, 'YYYY-MM-DD') as period_end,
                 r.status, r.data, u.email as author_email, u.department,
                 r.created_at, r.updated_at
          FROM reports r
          JOIN users u ON r.user_id = u.id
          ORDER BY r.updated_at DESC
          LIMIT 250;
        `
      : Promise.resolve([]),
  ]);

  return NextResponse.json({
    api_version: "1.0",
    system: "YETAF Directive Follow-up System / Report Follow-up Center",
    exported_at: new Date().toISOString(),
    counts: {
      directives: directives.length,
      action_plans: plans.length,
      tasks: tasks.length,
      reports: reports.length,
    },
    data: {
      directives,
      action_plans: plans,
      tasks,
      reports,
    },
  });
}

