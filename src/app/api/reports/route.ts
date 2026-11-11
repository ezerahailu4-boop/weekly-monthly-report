import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getReportingWindowStatus } from "@/lib/portalSettings";

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
        ${status || "submitted"},
        ${JSON.stringify(data)}
      )
      RETURNING id, user_id, report_type, period_start, period_end, status, created_at;
    `;

    return NextResponse.json({ success: true, report: rows[0] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

