import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const rows = await sql`
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
  `;

  if (rows.length === 0) {
    return NextResponse.json({ error: "Directive not found" }, { status: 404 });
  }

  const [tasks, comments, plans] = await Promise.all([
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
  ]);

  return NextResponse.json({
    success: true,
    directive: rows[0],
    tasks,
    comments,
    plans,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const isPrivileged = user.role === "admin" || user.role === "super_admin";

  try {
    const body = await request.json();

    const existing = await sql`SELECT * FROM directives WHERE id = ${id} LIMIT 1;`;
    if (existing.length === 0) {
      return NextResponse.json({ error: "Directive not found" }, { status: 404 });
    }
    const curr = existing[0];

    if (!isPrivileged) {
      // Non-privileged users may only update status to in_progress or completed
      if (!["in_progress", "completed"].includes(body.status)) {
        return NextResponse.json(
          { error: "Forbidden: Only Admin or Direction can modify directive parameters." },
          { status: 403 }
        );
      }
      await sql`
        UPDATE directives
        SET status = ${body.status}, updated_at = now()
        WHERE id = ${id};
      `;
    } else {
      const nextStatus = ["open", "in_progress", "awaiting_response", "completed", "closed"].includes(
        body.status
      )
        ? body.status
        : curr.status;
      const nextPriority = ["low", "medium", "high", "urgent"].includes(body.priority)
        ? body.priority
        : curr.priority;
      const nextTitle =
        typeof body.title === "string" && body.title.trim()
          ? body.title.trim()
          : curr.title;
      const nextSummary =
        typeof body.executive_summary === "string"
          ? body.executive_summary.trim()
          : curr.executive_summary;
      const nextSlaDays =
        typeof body.sla_days === "number" && body.sla_days >= 1 && body.sla_days <= 60
          ? Math.round(body.sla_days)
          : curr.sla_days;
      const nextDueDate =
        body.due_date === null
          ? null
          : typeof body.due_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.due_date)
          ? body.due_date
          : curr.due_date;

      await sql`
        UPDATE directives
        SET title = ${nextTitle},
            status = ${nextStatus},
            priority = ${nextPriority},
            executive_summary = ${nextSummary},
            sla_days = ${nextSlaDays},
            due_date = ${nextDueDate},
            updated_at = now()
        WHERE id = ${id};
      `;
    }

    const updated = await sql`
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
    `;

    return NextResponse.json({ success: true, directive: updated[0] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "admin" && user.role !== "super_admin") {
    return NextResponse.json(
      { error: "Forbidden: Admin or Direction privileges required." },
      { status: 403 }
    );
  }

  const { id } = await params;
  await sql`DELETE FROM directives WHERE id = ${id};`;
  return NextResponse.json({ success: true });
}

