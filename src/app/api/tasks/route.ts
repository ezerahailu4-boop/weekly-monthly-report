import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { notifyTaskAssigneeViaTelegram } from "@/lib/telegram";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope");
  const isPrivileged = user.role === "admin" || user.role === "super_admin";

  const rows =
    isPrivileged && scope !== "mine"
      ? await sql`
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
          ORDER BY
            CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END ASC,
            t.due_date ASC NULLS LAST,
            t.created_at DESC;
        `
      : await sql`
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
          WHERE t.assigned_to = ${user.id}
          ORDER BY
            CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END ASC,
            t.due_date ASC NULLS LAST,
            t.created_at DESC;
        `;

  return NextResponse.json({ success: true, tasks: rows });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "admin" && user.role !== "super_admin") {
    return NextResponse.json(
      { error: "Forbidden: Admin or Super Admin privileges required to assign tasks." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const {
      title,
      description,
      assigned_to,
      priority = "medium",
      due_date,
      notify_telegram = true,
    } = body;

    if (!title || !String(title).trim() || !assigned_to) {
      return NextResponse.json(
        { error: "Task title and assigned user are required." },
        { status: 400 }
      );
    }

    if (!["low", "medium", "high", "urgent"].includes(priority)) {
      return NextResponse.json({ error: "Invalid priority value." }, { status: 400 });
    }

    const userRows = await sql`
      SELECT id FROM users WHERE id = ${assigned_to} LIMIT 1;
    `;
    if (userRows.length === 0) {
      return NextResponse.json(
        { error: "Selected assignee does not exist." },
        { status: 404 }
      );
    }

    const cleanDueDate =
      typeof due_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(due_date.trim())
        ? due_date.trim()
        : null;

    const inserted = await sql`
      INSERT INTO tasks (title, description, assigned_to, assigned_by, priority, due_date)
      VALUES (
        ${String(title).trim()},
        ${typeof description === "string" ? description.trim() : ""},
        ${assigned_to},
        ${user.id},
        ${priority},
        ${cleanDueDate}
      )
      RETURNING id;
    `;

    const taskId = inserted[0].id as string;

    let telegramResult: { sent: boolean; error?: string } = { sent: false };
    if (notify_telegram !== false) {
      const origin = new URL(request.url).origin;
      telegramResult = await notifyTaskAssigneeViaTelegram({
        taskId,
        portalOrigin: process.env.NEXT_PUBLIC_APP_URL || origin,
      });
    }

    const fullRows = await sql`
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
      WHERE t.id = ${taskId}
      LIMIT 1;
    `;

    return NextResponse.json({
      success: true,
      task: fullRows[0],
      telegram: telegramResult,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

