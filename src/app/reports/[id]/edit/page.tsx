import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getReportingWindowStatus } from "@/lib/portalSettings";
import { ReportingWindowLockedView } from "@/components/ReportingWindowBanner";
import { EditReportForm } from "./EditReportForm";
import type { ReportRow } from "@/types/report";

export const dynamic = "force-dynamic";

export default async function EditReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (user.role === "employee") {
    const windowStatus = await getReportingWindowStatus();
    if (!windowStatus.isOpen) {
      return <ReportingWindowLockedView status={windowStatus} />;
    }
  }

  const rows = await sql`
    SELECT r.id, r.user_id, r.report_type,
           to_char(r.period_start, 'YYYY-MM-DD') as period_start,
           to_char(r.period_end, 'YYYY-MM-DD') as period_end,
           r.status, r.data, r.created_at, r.updated_at
    FROM reports r
    WHERE r.id = ${id}
    LIMIT 1;
  `;

  if (rows.length === 0) notFound();

  const row = rows[0];

  // Only the creator, admin, or super_admin can edit
  const isAuthorized = user.id === row.user_id || user.role === "admin" || user.role === "super_admin";
  if (!isAuthorized) {
    redirect("/dashboard");
  }

  const report: ReportRow = {
    id: row.id,
    user_id: row.user_id,
    report_type: row.report_type,
    period_start: row.period_start,
    period_end: row.period_end,
    status: row.status,
    data: row.data,
    created_at: typeof row.created_at === "string" ? row.created_at : row.created_at.toISOString(),
    updated_at: typeof row.updated_at === "string" ? row.updated_at : row.updated_at.toISOString(),
  };

  return <EditReportForm initialReport={report} />;
}

