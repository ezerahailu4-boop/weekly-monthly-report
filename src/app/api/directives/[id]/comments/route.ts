import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getPortalSettings } from "@/lib/portalSettings";
import type { FileAttachmentMeta } from "@/types/directive";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [directiveRows, comments] = await Promise.all([
    sql`
      SELECT id, status, sla_days, last_comment_at, sla_due_at
      FROM directives
      WHERE id = ${id}
      LIMIT 1;
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
  ]);

  if (directiveRows.length === 0) {
    return NextResponse.json({ error: "Directive not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    comments,
    sla: directiveRows[0],
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const attachment: FileAttachmentMeta | null =
      body.attachment && typeof body.attachment === "object" ? body.attachment : null;

    if (!message && !attachment) {
      return NextResponse.json(
        { error: "Message or file attachment is required." },
        { status: 400 }
      );
    }

    const dirRows = await sql`
      SELECT id, sla_days, status
      FROM directives
      WHERE id = ${id}
      LIMIT 1;
    `;
    if (dirRows.length === 0) {
      return NextResponse.json({ error: "Directive not found" }, { status: 404 });
    }

    const settings = await getPortalSettings();
    const effectiveSlaDays =
      Number(dirRows[0].sla_days) || settings.sla_response_days || 3;

    // Mark any prior pending comments by *other* users as responded to
    await sql`
      UPDATE directive_comments
      SET responded_at = now()
      WHERE directive_id = ${id}
        AND user_id <> ${user.id}
        AND requires_response = true
        AND responded_at IS NULL;
    `;

    const requiresResponse = body.requires_response !== false;
    const deadlineDate = requiresResponse
      ? new Date(Date.now() + effectiveSlaDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const inserted = await sql`
      INSERT INTO directive_comments (
        directive_id, user_id, message, attachment, requires_response, sla_deadline_at
      )
      VALUES (
        ${id},
        ${user.id},
        ${message || "(Attached document)"},
        ${attachment ? JSON.stringify(attachment) : null}::jsonb,
        ${requiresResponse},
        ${deadlineDate}::timestamptz
      )
      RETURNING id, directive_id, user_id, message, attachment,
                requires_response, sla_deadline_at, responded_at, created_at;
    `;

    // Update directive SLA timer & status
    const nextStatus =
      dirRows[0].status === "completed" || dirRows[0].status === "closed"
        ? dirRows[0].status
        : requiresResponse
        ? "awaiting_response"
        : "in_progress";

    await sql`
      UPDATE directives
      SET last_comment_at = now(),
          sla_due_at = ${deadlineDate}::timestamptz,
          status = ${nextStatus},
          updated_at = now()
      WHERE id = ${id};
    `;

    const row = inserted[0];
    return NextResponse.json({
      success: true,
      comment: {
        ...row,
        author_name: user.full_name || user.email,
        author_role: user.role,
        author_department: user.department,
      },
      sla_due_at: deadlineDate,
      sla_days: effectiveSlaDays,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

