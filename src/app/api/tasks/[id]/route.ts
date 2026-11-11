import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { notifyTaskAssigneeViaTelegram } from "@/lib/telegram";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existingRows = await sql`
    SELECT id, assigned_to, status, title, description, priority,
           to_char(due_date, 'YYYY-MM-DD') as due_date, completion_note, completed_at
    FROM tasks WHERE id = ${id} LIMIT 1;
  `;

  if (existingRows.length === 0) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  const existing = existingRows[0];
  const isPrivileged = user.role === "admin" || user.role === "super_admin";
  const isAssignee = existing.assigned_to === user.id;

  if (!isPrivileged && !isAssignee) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();

    if (body.action === "resend_telegram") {
      if (!isPrivileged) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const origin = new URL(request.url).origin;
      const telegramResult = await notifyTaskAssigneeViaTelegram({
        taskId: id,
        portalOrigin: process.env.NEXT_PUBLIC_APP_URL || origin,
      });

      const refreshed = await sql`
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
        WHERE t.id = ${id}
        LIMIT 1;
      `;

      return NextResponse.json({
        success: telegramResult.sent,
        task: refreshed[0],
        telegram: telegramResult,
        error: telegramResult.error,
      });
    }

    const nextStatus =
      body.status && ["pending", "in_progress", "completed"].includes(body.status)
        ? body.status
        : existing.status;

    const nextNote =
      body.completion_note !== undefined
        ? String(body.completion_note).trim() || null
        : existing.completion_note;

    // Non-admins can only update status and completion_note on their own tasks
    const nextTitle =
      isPrivileged && typeof body.title === "string" && body.title.trim()
        ? body.title.trim()
        : existing.title;
    const nextDescription =
      isPrivileged && typeof body.description === "string"
        ? body.description.trim()
        : existing.description;
    const nextPriority =
      isPrivileged &&
      body.priority &&
      ["low", "medium", "high", "urgent"].includes(body.priority)
        ? body.priority
        : existing.priority;
    const nextDueDate =
      isPrivileged && body.due_date !== undefined
        ? typeof body.due_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.due_date.trim())
          ? body.due_date.trim()
          : null
        : existing.due_date;

    const isNowCompleted = nextStatus === "completed";
    const nextCompletedAt = isNowCompleted
      ? existing.completed_at || new Date().toISOString()
      : null;

    await sql`
      UPDATE tasks
      SET title = ${nextTitle},
          description = ${nextDescription},
          priority = ${nextPriority},
          due_date = ${nextDueDate},
          status = ${nextStatus},
          completion_note = ${nextNote},
          completed_at = ${nextCompletedAt},
          updated_at = now()
      WHERE id = ${id};
    `;

    const refreshed = await sql`
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
      WHERE t.id = ${id}
      LIMIT 1;
    `;

    return NextResponse.json({ success: true, task: refreshed[0] });
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
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    await sql`DELETE FROM tasks WHERE id = ${id};`;
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
