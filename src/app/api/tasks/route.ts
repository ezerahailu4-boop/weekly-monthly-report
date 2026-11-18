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
          SELECT t.id, t.title, t.description, t.assigned_to, t.assigned_by, t.directive_id,
                 t.status, t.priority, to_char(t.due_date, 'YYYY-MM-DD') as due_date,
                 t.completion_note, t.completed_at, t.telegram_notified_at, t.telegram_error,
                 t.created_at, t.updated_at,
                 u.full_name as assignee_name, u.email as assignee_email,
                 u.department as assignee_department, u.telegram_chat_id as assignee_telegram_chat_id,
                 ab.full_name as assigned_by_name,
                 d.reference_code as directive_ref, d.title as directive_title
          FROM tasks t
          JOIN users u ON t.assigned_to = u.id
          LEFT JOIN users ab ON t.assigned_by = ab.id
          LEFT JOIN directives d ON t.directive_id = d.id
          ORDER BY
            CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END ASC,
            t.due_date ASC NULLS LAST,
            t.created_at DESC;
        `
      : await sql`
          SELECT t.id, t.title, t.description, t.assigned_to, t.assigned_by, t.directive_id,
                 t.status, t.priority, to_char(t.due_date, 'YYYY-MM-DD') as due_date,
                 t.completion_note, t.completed_at, t.telegram_notified_at, t.telegram_error,
                 t.created_at, t.updated_at,
                 u.full_name as assignee_name, u.email as assignee_email,
                 u.department as assignee_department, u.telegram_chat_id as assignee_telegram_chat_id,
                 ab.full_name as assigned_by_name,
                 d.reference_code as directive_ref, d.title as directive_title
          FROM tasks t
          JOIN users u ON t.assigned_to = u.id
          LEFT JOIN users ab ON t.assigned_by = ab.id
          LEFT JOIN directives d ON t.directive_id = d.id
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

    // Support bulk mode: { tasks: [...], assigned_to: [...], notify_telegram }
    // Also support single mode for backward compat: { title, assigned_to, ... }
    const isBulk = Array.isArray(body.tasks) && Array.isArray(body.assigned_to);

    if (isBulk) {
      return handleBulkCreate(request, user, body);
    }
    return handleSingleCreate(request, user, body);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

interface BulkTaskInput {
  title: string;
  description?: string;
  priority?: string;
  due_date?: string | null;
}

async function handleBulkCreate(
  request: Request,
  user: { id: string },
  body: {
    tasks: BulkTaskInput[];
    assigned_to: string[];
    directive_id?: string | null;
    notify_telegram?: boolean;
  }
) {
  const {
    tasks: taskInputs,
    assigned_to: assigneeIds,
    directive_id = null,
    notify_telegram = true,
  } = body;

  if (!taskInputs.length || !assigneeIds.length) {
    return NextResponse.json(
      { error: "At least one task and one assignee are required." },
      { status: 400 }
    );
  }

  if (taskInputs.length > 20) {
    return NextResponse.json(
      { error: "Maximum 20 tasks per bulk assignment." },
      { status: 400 }
    );
  }
  if (assigneeIds.length > 50) {
    return NextResponse.json(
      { error: "Maximum 50 assignees per bulk assignment." },
      { status: 400 }
    );
  }

  // Validate all tasks have titles
  for (const t of taskInputs) {
    if (!t.title || !String(t.title).trim()) {
      return NextResponse.json(
        { error: "Every task must have a title." },
        { status: 400 }
      );
    }
  }

  // Validate all assignees exist
  const userRows = await sql`
    SELECT id FROM users WHERE id = ANY(${assigneeIds});
  `;
  if (userRows.length !== assigneeIds.length) {
    return NextResponse.json(
      { error: "One or more selected assignees do not exist." },
      { status: 404 }
    );
  }

  const validPriorities = ["low", "medium", "high", "urgent"];

  const createdTasks: { id: string; assignee: string }[] = [];
  const origin = new URL(request.url).origin;
  const portalOrigin = process.env.NEXT_PUBLIC_APP_URL || origin;

  // Create one task per (task, assignee) combination
  for (const taskInput of taskInputs) {
    const priority = validPriorities.includes(taskInput.priority || "")
      ? taskInput.priority!
      : "medium";
    const cleanDueDate =
      typeof taskInput.due_date === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(taskInput.due_date.trim())
        ? taskInput.due_date.trim()
        : null;

    for (const assigneeId of assigneeIds) {
      const inserted = await sql`
        INSERT INTO tasks (title, description, assigned_to, assigned_by, directive_id, priority, due_date)
        VALUES (
          ${String(taskInput.title).trim()},
          ${typeof taskInput.description === "string" ? taskInput.description.trim() : ""},
          ${assigneeId},
          ${user.id},
          ${directive_id || null},
          ${priority},
          ${cleanDueDate}
        )
        RETURNING id;
      `;
      createdTasks.push({ id: inserted[0].id as string, assignee: assigneeId });
    }
  }

  // Send Telegram notifications (best effort, don't block)
  const telegramResults: { taskId: string; sent: boolean; error?: string }[] = [];
  if (notify_telegram !== false) {
    for (const ct of createdTasks) {
      try {
        const result = await notifyTaskAssigneeViaTelegram({
          taskId: ct.id,
          portalOrigin,
        });
        telegramResults.push({ taskId: ct.id, ...result });
      } catch {
        telegramResults.push({ taskId: ct.id, sent: false, error: "notification failed" });
      }
    }
  }

  // Fetch all created tasks with full join data
  const taskIds = createdTasks.map((ct) => ct.id);
  const fullRows = await sql`
    SELECT t.id, t.title, t.description, t.assigned_to, t.assigned_by, t.directive_id,
           t.status, t.priority, to_char(t.due_date, 'YYYY-MM-DD') as due_date,
           t.completion_note, t.completed_at, t.telegram_notified_at, t.telegram_error,
           t.created_at, t.updated_at,
           u.full_name as assignee_name, u.email as assignee_email,
           u.department as assignee_department, u.telegram_chat_id as assignee_telegram_chat_id,
           ab.full_name as assigned_by_name,
           d.reference_code as directive_ref, d.title as directive_title
    FROM tasks t
    JOIN users u ON t.assigned_to = u.id
    LEFT JOIN users ab ON t.assigned_by = ab.id
    LEFT JOIN directives d ON t.directive_id = d.id
    WHERE t.id = ANY(${taskIds})
    ORDER BY t.created_at DESC;
  `;

  const telegramSent = telegramResults.filter((r) => r.sent).length;

  return NextResponse.json({
    success: true,
    bulk: true,
    created: fullRows.length,
    tasks: fullRows,
    telegram: {
      sent: telegramSent,
      total: telegramResults.length,
      results: telegramResults,
    },
  });
}

async function handleSingleCreate(
  request: Request,
  user: { id: string },
  body: {
    title?: string;
    description?: string;
    assigned_to?: string;
    directive_id?: string | null;
    priority?: string;
    due_date?: string | null;
    notify_telegram?: boolean;
  }
) {
  const {
    title,
    description,
    assigned_to,
    directive_id = null,
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
    INSERT INTO tasks (title, description, assigned_to, assigned_by, directive_id, priority, due_date)
    VALUES (
      ${String(title).trim()},
      ${typeof description === "string" ? description.trim() : ""},
      ${assigned_to},
      ${user.id},
      ${directive_id || null},
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
    SELECT t.id, t.title, t.description, t.assigned_to, t.assigned_by, t.directive_id,
           t.status, t.priority, to_char(t.due_date, 'YYYY-MM-DD') as due_date,
           t.completion_note, t.completed_at, t.telegram_notified_at, t.telegram_error,
           t.created_at, t.updated_at,
           u.full_name as assignee_name, u.email as assignee_email,
           u.department as assignee_department, u.telegram_chat_id as assignee_telegram_chat_id,
           ab.full_name as assigned_by_name,
           d.reference_code as directive_ref, d.title as directive_title
    FROM tasks t
    JOIN users u ON t.assigned_to = u.id
    LEFT JOIN users ab ON t.assigned_by = ab.id
    LEFT JOIN directives d ON t.directive_id = d.id
    WHERE t.id = ${taskId}
    LIMIT 1;
  `;

  return NextResponse.json({
    success: true,
    task: fullRows[0],
    telegram: telegramResult,
  });
}

