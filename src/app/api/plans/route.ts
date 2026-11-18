import crypto from "crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getPortalSettings } from "@/lib/portalSettings";
import { ETHIOPIA_TIMEZONE } from "@/lib/windowSchedule";
import type { ActionPlanObjective } from "@/types/plan";
import type { FileAttachmentMeta } from "@/types/directive";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isPrivileged = user.role === "admin" || user.role === "super_admin";

  const rows = isPrivileged
    ? await sql`
        SELECT p.id, p.reference_code, p.user_id, p.directive_id, p.title, p.department,
               to_char(p.period_start, 'YYYY-MM-DD') as period_start,
               to_char(p.period_end, 'YYYY-MM-DD') as period_end,
               p.entry_mode, p.objectives, p.summary, p.attachments, p.status,
               p.review_notes, p.reviewed_by, p.reviewed_at, p.created_at, p.updated_at,
               u.full_name as author_name, u.email as author_email,
               rev.full_name as reviewer_name,
               d.reference_code as directive_ref, d.title as directive_title
        FROM action_plans p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN users rev ON p.reviewed_by = rev.id
        LEFT JOIN directives d ON p.directive_id = d.id
        ORDER BY p.created_at DESC;
      `
    : await sql`
        SELECT p.id, p.reference_code, p.user_id, p.directive_id, p.title, p.department,
               to_char(p.period_start, 'YYYY-MM-DD') as period_start,
               to_char(p.period_end, 'YYYY-MM-DD') as period_end,
               p.entry_mode, p.objectives, p.summary, p.attachments, p.status,
               p.review_notes, p.reviewed_by, p.reviewed_at, p.created_at, p.updated_at,
               u.full_name as author_name, u.email as author_email,
               rev.full_name as reviewer_name,
               d.reference_code as directive_ref, d.title as directive_title
        FROM action_plans p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN users rev ON p.reviewed_by = rev.id
        LEFT JOIN directives d ON p.directive_id = d.id
        WHERE p.user_id = ${user.id}
        ORDER BY p.created_at DESC;
      `;

  return NextResponse.json({ success: true, plans: rows });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) {
      return NextResponse.json({ error: "Action plan title is required." }, { status: 400 });
    }

    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: ETHIOPIA_TIMEZONE,
    }).format(new Date());

    const periodStart =
      typeof body.period_start === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.period_start)
        ? body.period_start
        : today;
    const periodEnd =
      typeof body.period_end === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.period_end)
        ? body.period_end
        : periodStart;

    const entryMode = body.entry_mode === "upload" ? "upload" : "form";
    const objectives: ActionPlanObjective[] = Array.isArray(body.objectives)
      ? body.objectives.filter(
          (o: Partial<ActionPlanObjective>) => o && typeof o.activity === "string" && o.activity.trim()
        )
      : [];
    const attachments: FileAttachmentMeta[] = Array.isArray(body.attachments)
      ? body.attachments
      : [];

    if (entryMode === "form" && objectives.length === 0) {
      return NextResponse.json(
        { error: "Add at least one planned objective/milestone." },
        { status: 400 }
      );
    }
    if (entryMode === "upload" && attachments.length === 0 && objectives.length === 0) {
      return NextResponse.json(
        { error: "Upload a plan file or fill in structured plan objectives." },
        { status: 400 }
      );
    }

    const status = body.status === "draft" ? "draft" : "submitted";
    const department =
      typeof body.department === "string" && body.department.trim()
        ? body.department.trim()
        : user.department || "Operations & Logistics";
    const directiveId =
      typeof body.directive_id === "string" && body.directive_id.trim()
        ? body.directive_id.trim()
        : null;
    const summary = typeof body.summary === "string" ? body.summary.trim() : "";

    const settings = await getPortalSettings();
    const ethYear = today.slice(0, 4);
    const prefix = settings.letterhead_config.referencePrefix || "YH-DFC";
    const refCode = `${prefix}-PLN-${ethYear}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;

    const inserted = await sql`
      INSERT INTO action_plans (
        reference_code, user_id, directive_id, title, department,
        period_start, period_end, entry_mode, objectives, summary, attachments, status
      )
      VALUES (
        ${refCode},
        ${user.id},
        ${directiveId},
        ${title},
        ${department},
        ${periodStart}::date,
        ${periodEnd}::date,
        ${entryMode},
        ${JSON.stringify(objectives)}::jsonb,
        ${summary},
        ${JSON.stringify(attachments)}::jsonb,
        ${status}
      )
      RETURNING id;
    `;

    const planId = String(inserted[0].id);

    const rows = await sql`
      SELECT p.id, p.reference_code, p.user_id, p.directive_id, p.title, p.department,
             to_char(p.period_start, 'YYYY-MM-DD') as period_start,
             to_char(p.period_end, 'YYYY-MM-DD') as period_end,
             p.entry_mode, p.objectives, p.summary, p.attachments, p.status,
             p.review_notes, p.reviewed_by, p.reviewed_at, p.created_at, p.updated_at,
             u.full_name as author_name, u.email as author_email,
             d.reference_code as directive_ref, d.title as directive_title
      FROM action_plans p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN directives d ON p.directive_id = d.id
      WHERE p.id = ${planId}
      LIMIT 1;
    `;

    return NextResponse.json({ success: true, plan: rows[0] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

