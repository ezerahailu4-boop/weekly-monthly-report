import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { findCompanySettingsByErpKey } from "@/lib/portalSettings";

async function authorizeErpRequest(request: Request): Promise<{
  ok: boolean;
  companyId: string | null;
}> {
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    const matched = await findCompanySettingsByErpKey(token);
    if (matched) {
      return { ok: true, companyId: matched.company_id };
    }
  }
  const user = await getCurrentUser();
  if (user && (user.role === "admin" || user.role === "super_admin")) {
    return {
      ok: true,
      companyId: user.role === "super_admin" ? null : user.company_id,
    };
  }
  return { ok: false, companyId: null };
}

/**
 * GET /api/erp/v1/export?entity=all|directives|plans|tasks|reports&since=YYYY-MM-DD
 * Clean RESTful export endpoint for seamless ERP synchronization.
 */
export async function GET(request: Request) {
  const auth = await authorizeErpRequest(request);
  if (!auth.ok) {
    return NextResponse.json(
      { error: "Unauthorized: Provide a valid ERP Bearer API key or Admin session." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const entity = searchParams.get("entity") || "all";
  const cid = auth.companyId;

  const [directives, plans, tasks, reports] = await Promise.all([
    entity === "all" || entity === "directives"
      ? cid
        ? sql`
          SELECT d.id, d.reference_code, d.title, d.department, d.priority,
                 d.directions, d.executive_summary, d.entry_mode, d.status,
                 to_char(d.due_date, 'YYYY-MM-DD') as due_date,
                 d.sla_days, d.sla_due_at, d.created_at, d.updated_at
          FROM directives d
          LEFT JOIN users u ON d.created_by = u.id
          WHERE u.company_id = ${cid}
             OR EXISTS (SELECT 1 FROM tasks t JOIN users tu ON t.assigned_to = tu.id WHERE t.directive_id = d.id AND tu.company_id = ${cid})
          ORDER BY d.updated_at DESC
          LIMIT 250;
        `
        : sql`
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
      ? cid
        ? sql`
          SELECT p.id, p.reference_code, p.directive_id, p.title, p.department,
                 to_char(p.period_start, 'YYYY-MM-DD') as period_start,
                 to_char(p.period_end, 'YYYY-MM-DD') as period_end,
                 p.entry_mode, p.objectives, p.summary, p.status,
                 u.email as author_email, p.created_at, p.updated_at
          FROM action_plans p
          JOIN users u ON p.user_id = u.id
          WHERE u.company_id = ${cid}
          ORDER BY p.updated_at DESC
          LIMIT 250;
        `
        : sql`
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
      ? cid
        ? sql`
          SELECT t.id, t.directive_id, t.title, t.description, t.status, t.priority,
                 to_char(t.due_date, 'YYYY-MM-DD') as due_date,
                 u.email as assignee_email, u.department as assignee_department,
                 t.completed_at, t.created_at, t.updated_at
          FROM tasks t
          JOIN users u ON t.assigned_to = u.id
          WHERE u.company_id = ${cid}
          ORDER BY t.updated_at DESC
          LIMIT 250;
        `
        : sql`
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
      ? cid
        ? sql`
          SELECT r.id, r.report_type,
                 to_char(r.period_start, 'YYYY-MM-DD') as period_start,
                 to_char(r.period_end, 'YYYY-MM-DD') as period_end,
                 r.status, r.data, u.email as author_email, u.department,
                 r.created_at, r.updated_at
          FROM reports r
          JOIN users u ON r.user_id = u.id
          WHERE r.company_id = ${cid}
          ORDER BY r.updated_at DESC
          LIMIT 250;
        `
        : sql`
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

