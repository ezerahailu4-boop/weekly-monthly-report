import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getReportingWindowStatus } from "@/lib/portalSettings";
import { notifyAdminsReportSubmitted } from "@/lib/telegram";
import { createNotification, recordActivity } from "@/lib/activity";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role === "employee") {
    const windowStatus = await getReportingWindowStatus();
    if (!windowStatus.isOpen) {
      return NextResponse.json(
        {
          error: `Reporting submissions are currently closed. ${windowStatus.countdownLabel}.`,
          windowClosed: true,
        },
        { status: 403 }
      );
    }
  }

  try {
    const { report_type, period_start, period_end, status, data } = await request.json();
    const safeStatus = status === "draft" ? "draft" : "submitted";

    if (!report_type || !period_start || !period_end || !data) {
      return NextResponse.json(
        { error: "Missing required report parameters." },
        { status: 400 }
      );
    }

    const rows = await sql`
      INSERT INTO reports (user_id, report_type, period_start, period_end, status, data)
      VALUES (
        ${user.id},
        ${report_type},
        ${period_start},
        ${period_end},
        ${safeStatus},
        ${JSON.stringify(data)}
      )
      RETURNING id, user_id, report_type, period_start, period_end, status, created_at;
    `;

    await recordActivity({ actorId: user.id, action: safeStatus === "draft" ? "saved draft" : "submitted", entityType: "report", entityId: rows[0].id, details: { reportType: report_type, periodStart: period_start, periodEnd: period_end } });

    // Notify admins via Telegram when a report is submitted (not draft)
    if (safeStatus === "submitted") {
      const admins = await sql`SELECT id FROM users WHERE role IN ('admin', 'super_admin') AND id <> ${user.id};`;
      await Promise.all(admins.map((admin) => createNotification({ userId: admin.id, title: "Report submitted", message: `${user.full_name} submitted a ${report_type} report.`, href: `/reports/${rows[0].id}`, kind: "info" })));
      const origin = request.headers.get("origin") || request.headers.get("referer")?.split("/").slice(0, 3).join("/") || null;
      notifyAdminsReportSubmitted({
        reportId: rows[0].id,
        reportType: report_type,
        authorName: user.full_name,
        authorDepartment: user.department,
        periodStart: period_start,
        periodEnd: period_end,
        portalOrigin: origin,
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, report: rows[0] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

