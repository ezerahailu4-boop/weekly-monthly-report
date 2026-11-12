import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isPrivileged = user.role === "admin" || user.role === "super_admin";

  interface CsvReportRow {
    id: string;
    report_type: string;
    period_start: string;
    period_end: string;
    status: string;
    created_at: string | Date;
    updated_at: string | Date;
    review_notes: string | null;
    reviewed_at: string | Date | null;
    author_name: string | null;
    author_department: string | null;
    author_email: string | null;
    reviewer_name: string | null;
  }

  let rows: CsvReportRow[];
  if (isPrivileged) {
    rows = (await sql`
      SELECT r.id, r.report_type,
             to_char(r.period_start, 'YYYY-MM-DD') as period_start,
             to_char(r.period_end, 'YYYY-MM-DD') as period_end,
             r.status, r.created_at, r.updated_at,
             r.review_notes, r.reviewed_at,
             u.full_name as author_name, u.department as author_department, u.email as author_email,
             rev.full_name as reviewer_name
      FROM reports r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN users rev ON r.reviewed_by = rev.id
      ORDER BY r.created_at DESC;
    `) as CsvReportRow[];
  } else {
    rows = (await sql`
      SELECT r.id, r.report_type,
             to_char(r.period_start, 'YYYY-MM-DD') as period_start,
             to_char(r.period_end, 'YYYY-MM-DD') as period_end,
             r.status, r.created_at, r.updated_at,
             r.review_notes, r.reviewed_at,
             u.full_name as author_name, u.department as author_department, u.email as author_email,
             rev.full_name as reviewer_name
      FROM reports r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN users rev ON r.reviewed_by = rev.id
      WHERE r.user_id = ${user.id}
      ORDER BY r.created_at DESC;
    `) as CsvReportRow[];
  }

  const headers = [
    "Report ID",
    "Report Type",
    "Period Start",
    "Period End",
    "Author Name",
    "Department",
    "Author Email",
    "Review Status",
    "Reviewing Executive",
    "Review Date",
    "Review Directives / Notes",
    "Created Timestamp",
    "Last Updated",
  ];

  function escapeCsvCell(cell: unknown) {
    if (cell === null || cell === undefined) return '""';
    const str = String(cell).replace(/"/g, '""');
    return `"${str}"`;
  }

  const csvRows = [
    headers.join(","),
    ...rows.map((r) =>
      [
        `YH-${r.id.slice(0, 8).toUpperCase()}`,
        r.report_type,
        r.period_start,
        r.period_end,
        r.author_name || "",
        r.author_department || "",
        r.author_email || "",
        r.status,
        r.reviewer_name || "",
        r.reviewed_at ? String(r.reviewed_at).slice(0, 10) : "",
        r.review_notes || "",
        String(r.created_at).slice(0, 19),
        String(r.updated_at).slice(0, 19),
      ]
        .map(escapeCsvCell)
        .join(",")
    ),
  ];

  const csvContent = "\uFEFF" + csvRows.join("\r\n"); // UTF-8 BOM for Excel compatibility

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="yetaf-holding-reports-summary-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

