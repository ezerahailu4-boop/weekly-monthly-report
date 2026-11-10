import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import type { ReportRow } from "@/types/report";

/**
 * Fetches a report for export.
 * Enforces that the requester is either the report's owner, an admin, or the super_admin.
 * Returns null if the caller is unauthenticated or unauthorized.
 */
export async function getReportForExport(id: string): Promise<ReportRow | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  try {
    const rows = await sql`
      SELECT r.id, r.user_id, r.report_type,
             to_char(r.period_start, 'YYYY-MM-DD') as period_start,
             to_char(r.period_end, 'YYYY-MM-DD') as period_end,
             r.status, r.data, r.review_notes, r.reviewed_by, r.reviewed_at,
             r.created_at, r.updated_at,
             u.full_name, u.department,
             rev.full_name as reviewer_name
      FROM reports r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN users rev ON r.reviewed_by = rev.id
      WHERE r.id = ${id}
      LIMIT 1;
    `;

    if (rows.length === 0) return null;

    const row = rows[0];

    // Access control: owner, admin, or super_admin
    const isPrivileged = user.role === "admin" || user.role === "super_admin";
    if (row.user_id !== user.id && !isPrivileged) {
      return null;
    }

    return {
      id: row.id,
      user_id: row.user_id,
      report_type: row.report_type,
      period_start: row.period_start,
      period_end: row.period_end,
      status: row.status,
      data: row.data,
      created_at: typeof row.created_at === "string" ? row.created_at : row.created_at.toISOString(),
      updated_at: typeof row.updated_at === "string" ? row.updated_at : row.updated_at.toISOString(),
      author_name: row.full_name,
      author_department: row.department,
      review_notes: row.review_notes,
      reviewed_by: row.reviewed_by,
      reviewed_at: row.reviewed_at ? (typeof row.reviewed_at === "string" ? row.reviewed_at : row.reviewed_at.toISOString()) : null,
      reviewer_name: row.reviewer_name,
      profiles: {
        full_name: row.full_name,
        department: row.department,
      },
    };
  } catch (err: unknown) {
    console.error("Error retrieving report for export:", err);
    return null;
  }
}
