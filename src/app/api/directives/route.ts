import crypto from "crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getPortalSettings } from "@/lib/portalSettings";
import { summarizeDirections } from "@/lib/directiveSummarizer";
import { notifyTaskAssigneeViaTelegram } from "@/lib/telegram";
import { ETHIOPIA_TIMEZONE } from "@/lib/windowSchedule";
import type { DirectionPoint, FileAttachmentMeta } from "@/types/directive";

interface InitialTaskInput {
  title: string;
  description?: string;
  assigned_to: string;
  priority?: string;
  due_date?: string | null;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status");
  const isPrivileged = user.role === "admin" || user.role === "super_admin";

  const rows = isPrivileged
    ? await sql`
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
    : await sql`
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
      `;

  const filtered =
    statusFilter && statusFilter !== "all"
      ? rows.filter((r) => r.status === statusFilter)
      : rows;

  return NextResponse.json({ success: true, directives: filtered });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "admin" && user.role !== "super_admin") {
    return NextResponse.json(
      { error: "Forbidden: Admin or Direction privileges required to issue directives." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) {
      return NextResponse.json({ error: "Directive title is required." }, { status: 400 });
    }

    const department =
      typeof body.department === "string" && body.department.trim()
        ? body.department.trim()
        : "All Departments";
    const priority = ["low", "medium", "high", "urgent"].includes(body.priority)
      ? body.priority
      : "medium";
    const entryMode = body.entry_mode === "upload" ? "upload" : "form";

    const rawDirections = Array.isArray(body.directions) ? body.directions : [];
    const directions: DirectionPoint[] = rawDirections
      .map((d: unknown) => {
        if (typeof d === "string") return { text: d.trim() };
        if (d && typeof d === "object") {
          const obj = d as Partial<DirectionPoint>;
          return {
            text: typeof obj.text === "string" ? obj.text.trim() : "",
            owner: typeof obj.owner === "string" ? obj.owner.trim() : undefined,
            due_date: typeof obj.due_date === "string" ? obj.due_date.trim() : undefined,
          };
        }
        return { text: "" };
      })
      .filter((d: DirectionPoint) => d.text.length > 0);

    const attachments: FileAttachmentMeta[] = Array.isArray(body.attachments)
      ? body.attachments
      : [];

    if (entryMode === "form" && directions.length === 0) {
      return NextResponse.json(
        { error: "Provide at least 1 direction point (2–3 recommended)." },
        { status: 400 }
      );
    }
    if (entryMode === "upload" && attachments.length === 0 && directions.length === 0) {
      return NextResponse.json(
        { error: "Upload a directive document or provide direction points." },
        { status: 400 }
      );
    }

    const settings = await getPortalSettings();
    const slaDays =
      typeof body.sla_days === "number" && body.sla_days >= 1 && body.sla_days <= 60
        ? Math.round(body.sla_days)
        : settings.sla_response_days;

    const cleanDueDate =
      typeof body.due_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.due_date.trim())
        ? body.due_date.trim()
        : null;

    let executiveSummary =
      typeof body.executive_summary === "string" ? body.executive_summary.trim() : "";

    if (!executiveSummary && directions.length > 0) {
      const synth = await summarizeDirections({
        title,
        department,
        priority,
        dueDate: cleanDueDate,
        directions,
      });
      executiveSummary = synth.summary;
    }

    const ethYear = new Intl.DateTimeFormat("en-US", {
      timeZone: ETHIOPIA_TIMEZONE,
      year: "numeric",
    }).format(new Date());
    const prefix = settings.letterhead_config.referencePrefix || "YH-DFC";
    const refCode = `${prefix}-DIR-${ethYear}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;

    const sourceReportId =
      typeof body.source_report_id === "string" && body.source_report_id.trim()
        ? body.source_report_id.trim()
        : null;

    const inserted = await sql`
      INSERT INTO directives (
        reference_code, title, department, priority, directions, executive_summary,
        entry_mode, attachments, status, due_date, sla_days, source_report_id, created_by
      )
      VALUES (
        ${refCode},
        ${title},
        ${department},
        ${priority},
        ${JSON.stringify(directions)}::jsonb,
        ${executiveSummary},
        ${entryMode},
        ${JSON.stringify(attachments)}::jsonb,
        'open',
        ${cleanDueDate},
        ${slaDays},
        ${sourceReportId},
        ${user.id}
      )
      RETURNING id;
    `;

    const directiveId = String(inserted[0].id);

    // Optional concurrent multi-tasks created under this directive
    const initialTasks: InitialTaskInput[] = Array.isArray(body.initial_tasks)
      ? body.initial_tasks
      : [];
    const notifyTelegram = body.notify_telegram !== false;
    const origin = new URL(request.url).origin;
    const portalOrigin = process.env.NEXT_PUBLIC_APP_URL || origin;

    let tasksCreated = 0;
    for (const t of initialTasks) {
      if (!t.title || !String(t.title).trim() || !t.assigned_to) continue;
      const tPriority = ["low", "medium", "high", "urgent"].includes(t.priority || "")
        ? t.priority!
        : priority;
      const tDue =
        typeof t.due_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(t.due_date.trim())
          ? t.due_date.trim()
          : cleanDueDate;

      const tRow = await sql`
        INSERT INTO tasks (title, description, assigned_to, assigned_by, directive_id, priority, due_date)
        VALUES (
          ${String(t.title).trim()},
          ${typeof t.description === "string" ? t.description.trim() : ""},
          ${t.assigned_to},
          ${user.id},
          ${directiveId},
          ${tPriority},
          ${tDue}
        )
        RETURNING id;
      `;
      tasksCreated += 1;

      if (notifyTelegram) {
        try {
          await notifyTaskAssigneeViaTelegram({
            taskId: String(tRow[0].id),
            portalOrigin,
          });
        } catch {
          // Non-blocking notification
        }
      }
    }

    const fullRows = await sql`
      SELECT d.id, d.reference_code, d.title, d.department, d.priority,
             d.directions, d.executive_summary, d.entry_mode, d.attachments,
             d.status, to_char(d.due_date, 'YYYY-MM-DD') as due_date,
             d.sla_days, d.last_comment_at, d.sla_due_at, d.source_report_id,
             d.created_by, d.created_at, d.updated_at,
             u.full_name as created_by_name,
             ${tasksCreated}::int as total_tasks,
             0::int as completed_tasks,
             0::int as comment_count
      FROM directives d
      LEFT JOIN users u ON d.created_by = u.id
      WHERE d.id = ${directiveId}
      LIMIT 1;
    `;

    return NextResponse.json({
      success: true,
      directive: fullRows[0],
      tasksCreated,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

