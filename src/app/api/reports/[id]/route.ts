import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify ownership or admin/super_admin role
  const existingRows = await sql`
    SELECT id, user_id, status FROM reports WHERE id = ${id} LIMIT 1;
  `;

  if (existingRows.length === 0) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const report = existingRows[0];
  const isPrivileged = user.role === "admin" || user.role === "super_admin";
  if (report.user_id !== user.id && !isPrivileged) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { period_start, period_end, status, data, review_notes } = body;

    // Determine reviewed metadata
    const isMarkingReviewed = status === "reviewed";
    const reviewedBy = isMarkingReviewed ? user.id : (status === "submitted" || status === "draft" ? null : undefined);
    const reviewedAt = isMarkingReviewed ? "now()" : null;

    let updatedRows;
    if (data !== undefined) {
      updatedRows = await sql`
        UPDATE reports
        SET period_start = COALESCE(${period_start}, period_start),
            period_end = COALESCE(${period_end}, period_end),
            status = COALESCE(${status}, status),
            data = ${JSON.stringify(data)},
            review_notes = COALESCE(${review_notes ?? null}, review_notes),
            reviewed_by = ${reviewedBy !== undefined ? reviewedBy : sql`reviewed_by`},
            reviewed_at = ${isMarkingReviewed ? sql`now()` : (status === "submitted" || status === "draft" ? null : sql`reviewed_at`)},
            updated_at = now()
        WHERE id = ${id}
        RETURNING id, report_type, status, review_notes, reviewed_by, reviewed_at, updated_at;
      `;
    } else {
      updatedRows = await sql`
        UPDATE reports
        SET status = COALESCE(${status}, status),
            review_notes = COALESCE(${review_notes ?? null}, review_notes),
            reviewed_by = ${reviewedBy !== undefined ? reviewedBy : sql`reviewed_by`},
            reviewed_at = ${isMarkingReviewed ? sql`now()` : (status === "submitted" || status === "draft" ? null : sql`reviewed_at`)},
            updated_at = now()
        WHERE id = ${id}
        RETURNING id, report_type, status, review_notes, reviewed_by, reviewed_at, updated_at;
      `;
    }

    return NextResponse.json({ success: true, report: updatedRows[0] });
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

  const { id } = await params;

  const existingRows = await sql`
    SELECT id, user_id FROM reports WHERE id = ${id} LIMIT 1;
  `;

  if (existingRows.length === 0) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const report = existingRows[0];
  const isPrivileged = user.role === "admin" || user.role === "super_admin";
  if (report.user_id !== user.id && !isPrivileged) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await sql`DELETE FROM reports WHERE id = ${id};`;
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
