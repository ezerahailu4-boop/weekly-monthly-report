import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const rows = await sql`
    SELECT p.id, p.reference_code, p.user_id, p.directive_id, p.title, p.department,
           to_char(p.period_start, 'YYYY-MM-DD') as period_start,
           to_char(p.period_end, 'YYYY-MM-DD') as period_end,
           p.entry_mode, p.objectives, p.summary, p.attachments, p.status,
           p.review_notes, p.reviewed_by, p.reviewed_at, p.created_at, p.updated_at,
           u.full_name as author_name, u.email as author_email, u.company_id as author_company_id,
           rev.full_name as reviewer_name,
           d.reference_code as directive_ref, d.title as directive_title
    FROM action_plans p
    JOIN users u ON p.user_id = u.id
    LEFT JOIN users rev ON p.reviewed_by = rev.id
    LEFT JOIN directives d ON p.directive_id = d.id
    WHERE p.id = ${id}
    LIMIT 1;
  `;

  if (rows.length === 0) {
    return NextResponse.json({ error: "Action plan not found" }, { status: 404 });
  }

  const plan = rows[0];
  const isPrivileged =
    user.role === "super_admin" ||
    (user.role === "admin" && plan.author_company_id === user.company_id);
  if (!isPrivileged && plan.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ success: true, plan });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const existing = await sql`
    SELECT p.*, u.company_id as author_company_id
    FROM action_plans p
    JOIN users u ON p.user_id = u.id
    WHERE p.id = ${id}
    LIMIT 1;
  `;
  if (existing.length === 0) {
    return NextResponse.json({ error: "Action plan not found" }, { status: 404 });
  }
  const curr = existing[0];
  const isPrivileged =
    user.role === "super_admin" ||
    (user.role === "admin" && curr.author_company_id === user.company_id);
  const isOwner = curr.user_id === user.id;

  if (!isPrivileged && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validStatuses = ["draft", "submitted", "approved", "revision_requested", "completed"];

    let nextStatus = curr.status;
    if (typeof body.status === "string" && validStatuses.includes(body.status)) {
      if ((body.status === "approved" || body.status === "revision_requested") && !isPrivileged) {
        return NextResponse.json(
          { error: "Only Admin or Direction can approve or request revisions." },
          { status: 403 }
        );
      }
      nextStatus = body.status;
    }

    const nextObjectives = Array.isArray(body.objectives) ? body.objectives : curr.objectives;
    const nextSummary =
      typeof body.summary === "string" ? body.summary.trim() : curr.summary;
    const nextReviewNotes =
      isPrivileged && typeof body.review_notes === "string"
        ? body.review_notes.trim()
        : curr.review_notes;
    const isReviewAction =
      isPrivileged &&
      (nextStatus === "approved" ||
        nextStatus === "revision_requested" ||
        typeof body.review_notes === "string");

    await sql`
      UPDATE action_plans
      SET status = ${nextStatus},
          objectives = ${JSON.stringify(nextObjectives)}::jsonb,
          summary = ${nextSummary},
          review_notes = ${nextReviewNotes},
          reviewed_by = ${isReviewAction ? user.id : curr.reviewed_by},
          reviewed_at = ${isReviewAction ? new Date().toISOString() : curr.reviewed_at},
          updated_at = now()
      WHERE id = ${id};
    `;

    const updated = await sql`
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
      WHERE p.id = ${id}
      LIMIT 1;
    `;

    return NextResponse.json({ success: true, plan: updated[0] });
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
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const existing = await sql`
    SELECT p.user_id, u.company_id as author_company_id
    FROM action_plans p
    JOIN users u ON p.user_id = u.id
    WHERE p.id = ${id}
    LIMIT 1;
  `;
  if (existing.length === 0) {
    return NextResponse.json({ error: "Action plan not found" }, { status: 404 });
  }

  const isPrivileged =
    user.role === "super_admin" ||
    (user.role === "admin" && existing[0].author_company_id === user.company_id);
  if (!isPrivileged && existing[0].user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await sql`DELETE FROM action_plans WHERE id = ${id};`;
  return NextResponse.json({ success: true });
}

