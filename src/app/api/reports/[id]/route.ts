import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getReportingWindowStatus } from "@/lib/portalSettings";
import { notifyAuthorReportReviewed } from "@/lib/telegram";
import { createNotification, recordActivity } from "@/lib/activity";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role === "employee") {
    const windowStatus = await getReportingWindowStatus();
    if (!windowStatus.isOpen) {
      return NextResponse.json(
        {
          error: `Reporting submissions & edits are currently locked. ${windowStatus.countdownLabel}.`,
          windowClosed: true,
        },
        { status: 403 }
      );
    }
  }

  const { id } = await params;

  // Verify ownership or admin/super_admin role
  const existingRows = await sql`
    SELECT id, user_id, company_id, status, reviewed_by, reviewed_at FROM reports WHERE id = ${id} LIMIT 1;
  `;

  if (existingRows.length === 0) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const report = existingRows[0];
  const isPrivileged = user.role === "super_admin" || (user.role === "admin" && report.company_id === user.company_id);
  if (report.user_id !== user.id && !isPrivileged) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { period_start, period_end, status, data, review_notes } = body;
    if (status !== undefined && !["draft", "submitted", "reviewed"].includes(status)) {
      return NextResponse.json({ error: "Invalid report status." }, { status: 400 });
    }
    if (!isPrivileged && status === "reviewed") {
      return NextResponse.json({ error: "Only management can approve reports." }, { status: 403 });
    }
    const nextReviewNotes = isPrivileged && typeof review_notes === "string" ? review_notes.trim() || null : null;

    // Determine reviewed metadata
    const isMarkingReviewed = status === "reviewed";
    const isReopening = status === "submitted" || status === "draft";
    const nextReviewedBy = isMarkingReviewed
      ? user.id
      : isReopening
      ? null
      : report.reviewed_by;
    const nextReviewedAt = isMarkingReviewed
      ? new Date().toISOString()
      : isReopening
      ? null
      : report.reviewed_at;

    let updatedRows;
    if (data !== undefined) {
      updatedRows = await sql`
        UPDATE reports
        SET period_start = COALESCE(${period_start}, period_start),
            period_end = COALESCE(${period_end}, period_end),
            status = COALESCE(${status}, status),
            data = ${JSON.stringify(data)},
            review_notes = COALESCE(${nextReviewNotes}, review_notes),
            reviewed_by = ${nextReviewedBy},
            reviewed_at = ${nextReviewedAt},
            updated_at = now()
        WHERE id = ${id}
        RETURNING id, report_type, status, review_notes, reviewed_by, reviewed_at, updated_at;
      `;
    } else {
      updatedRows = await sql`
        UPDATE reports
        SET status = COALESCE(${status}, status),
            review_notes = COALESCE(${nextReviewNotes}, review_notes),
            reviewed_by = ${nextReviewedBy},
            reviewed_at = ${nextReviewedAt},
            updated_at = now()
        WHERE id = ${id}
        RETURNING id, report_type, status, review_notes, reviewed_by, reviewed_at, updated_at;
      `;
    }

    // Notify report author via Telegram when marked as reviewed
    if (status === "reviewed" || status === "draft") {
      const approved = status === "reviewed";
      await recordActivity({ actorId: user.id, action: approved ? "approved report" : "requested revisions", entityType: "report", entityId: id, details: { notes: nextReviewNotes } });
      if (report.user_id !== user.id) await createNotification({ userId: report.user_id, title: approved ? "Report approved" : "Revisions requested", message: approved ? `${user.full_name} approved your report.` : `${user.full_name} requested changes to your report${nextReviewNotes ? `: ${nextReviewNotes}` : "."}`, href: `/reports/${id}`, kind: approved ? "success" : "warning" });
    } else if (data !== undefined) {
      await recordActivity({ actorId: user.id, action: "edited report", entityType: "report", entityId: id });
    }

    if (isMarkingReviewed && !report.reviewed_by) {
      const origin = request.headers.get("origin") || request.headers.get("referer")?.split("/").slice(0, 3).join("/") || null;
      notifyAuthorReportReviewed({
        reportId: id,
        reportType: updatedRows[0].report_type,
        reviewerName: user.full_name,
        reviewNotes: nextReviewNotes,
        portalOrigin: origin,
        authorUserId: report.user_id,
      }).catch((err) => {
        console.error("Telegram review notification failed:", {
          reportId: id,
          error: err instanceof Error ? err.message : String(err),
        });
      });
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

  if (user.role === "employee") {
    const windowStatus = await getReportingWindowStatus();
    if (!windowStatus.isOpen) {
      return NextResponse.json(
        {
          error: `Report modifications are locked while the reporting window is closed. ${windowStatus.countdownLabel}.`,
          windowClosed: true,
        },
        { status: 403 }
      );
    }
  }

  const { id } = await params;

  const existingRows = await sql`
    SELECT id, user_id, company_id FROM reports WHERE id = ${id} LIMIT 1;
  `;

  if (existingRows.length === 0) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const report = existingRows[0];
  const isPrivileged = user.role === "super_admin" || (user.role === "admin" && report.company_id === user.company_id);
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
