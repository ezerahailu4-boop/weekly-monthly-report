import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ExecutiveSummaryView } from "@/components/ExecutiveSummaryModal";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { ETHIOPIA_TIMEZONE } from "@/lib/windowSchedule";
import type { SummaryStaffMember } from "@/lib/executiveSummary";
import type { ReportRow } from "@/types/report";

export const dynamic = "force-dynamic";

export default async function ExecutiveSummaryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fexecutive-summary");

  const isSuperAdmin = user.role === "super_admin";
  if (!isSuperAdmin && user.role !== "admin") redirect("/dashboard");

  const reportRows = isSuperAdmin
    ? await sql`
        SELECT r.id, r.company_id, c.name AS company_name, r.user_id, r.report_type,
               to_char(r.period_start, 'YYYY-MM-DD') AS period_start,
               to_char(r.period_end, 'YYYY-MM-DD') AS period_end,
               r.status, r.data, r.created_at, r.updated_at,
               u.full_name AS author_name, u.department AS author_department,
               u.email AS author_email, rev.full_name AS reviewer_name,
               r.review_notes, r.reviewed_by, r.reviewed_at
        FROM reports r
        LEFT JOIN companies c ON c.id = r.company_id
        LEFT JOIN users u ON u.id = r.user_id
        LEFT JOIN users rev ON rev.id = r.reviewed_by
        ORDER BY r.period_start DESC, r.created_at DESC;
      `
    : await sql`
        SELECT r.id, r.company_id, c.name AS company_name, r.user_id, r.report_type,
               to_char(r.period_start, 'YYYY-MM-DD') AS period_start,
               to_char(r.period_end, 'YYYY-MM-DD') AS period_end,
               r.status, r.data, r.created_at, r.updated_at,
               u.full_name AS author_name, u.department AS author_department,
               u.email AS author_email, rev.full_name AS reviewer_name,
               r.review_notes, r.reviewed_by, r.reviewed_at
        FROM reports r
        LEFT JOIN companies c ON c.id = r.company_id
        LEFT JOIN users u ON u.id = r.user_id
        LEFT JOIN users rev ON rev.id = r.reviewed_by
        WHERE r.company_id = ${user.company_id}::uuid
        ORDER BY r.period_start DESC, r.created_at DESC;
      `;

  const staffRows = isSuperAdmin
    ? await sql`
        SELECT id, full_name, email, department, role
        FROM users
        ORDER BY full_name ASC;
      `
    : await sql`
        SELECT id, full_name, email, department, role
        FROM users
        WHERE company_id = ${user.company_id}::uuid
        ORDER BY full_name ASC;
      `;

  const reports: ReportRow[] = reportRows.map((row) => ({
    id: String(row.id),
    company_id: row.company_id ?? null,
    company_name: row.company_name ?? null,
    user_id: String(row.user_id),
    report_type: row.report_type,
    period_start: row.period_start,
    period_end: row.period_end,
    status: row.status,
    data: row.data,
    created_at: typeof row.created_at === "string" ? row.created_at : row.created_at.toISOString(),
    updated_at: typeof row.updated_at === "string" ? row.updated_at : row.updated_at.toISOString(),
    author_name: row.author_name ?? null,
    author_department: row.author_department ?? null,
    author_email: row.author_email ?? null,
    reviewer_name: row.reviewer_name ?? null,
    review_notes: row.review_notes ?? null,
    reviewed_by: row.reviewed_by ?? null,
    reviewed_at: row.reviewed_at
      ? typeof row.reviewed_at === "string"
        ? row.reviewed_at
        : row.reviewed_at.toISOString()
      : null,
    profiles: {
      full_name: row.author_name ?? null,
      department: row.author_department ?? null,
    },
  }));

  const staff: SummaryStaffMember[] = staffRows.map((member) => ({
    id: String(member.id),
    full_name: member.full_name ?? null,
    email: String(member.email ?? ""),
    department: member.department ?? null,
    role: member.role as SummaryStaffMember["role"],
  }));

  const todayEthYmd = new Intl.DateTimeFormat("en-CA", {
    timeZone: ETHIOPIA_TIMEZONE,
  }).format(new Date());

  return (
    <AppShell
      user={user}
      title="Executive Holding Summary"
      subtitle="Group-wide performance, reporting compliance, and leadership priorities"
    >
      <ExecutiveSummaryView
        reports={reports}
        staff={staff}
        todayEthYmd={todayEthYmd}
        scopeLabel={isSuperAdmin ? "YETAF Holding Limited" : user.company_name || "your company"}
      />
    </AppShell>
  );
}
