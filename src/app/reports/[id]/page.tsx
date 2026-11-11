import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getReportingWindowStatus } from "@/lib/portalSettings";
import { renderReportHtml } from "@/lib/reportHtml";
import { StatusBadge } from "@/components/StatusBadge";
import { ReportActionButtons } from "@/components/ReportActionButtons";
import {
  IconBuilding,
  IconCalendar,
  IconCheckCircle,
  IconCrown,
  IconMessageSquare,
  IconSend,
  IconUser,
} from "@/components/Icons";
import { formatDate } from "@/lib/dateUtils";
import type { ReportRow } from "@/types/report";

export const dynamic = "force-dynamic";

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const rows = await sql`
    SELECT r.id, r.user_id, r.report_type,
           to_char(r.period_start, 'YYYY-MM-DD') as period_start,
           to_char(r.period_end, 'YYYY-MM-DD') as period_end,
           r.status, r.data, r.review_notes, r.reviewed_by, r.reviewed_at,
           r.created_at, r.updated_at,
           u.full_name, u.department, u.role,
           rev.full_name as reviewer_name
    FROM reports r
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN users rev ON r.reviewed_by = rev.id
    WHERE r.id = ${id}
    LIMIT 1;
  `;

  if (rows.length === 0) notFound();

  const row = rows[0];

  const isPrivileged = user.role === "admin" || user.role === "super_admin";
  const isOwner = user.id === row.user_id;
  const isOwnerOrAdmin = isOwner || isPrivileged;

  if (!isOwnerOrAdmin) notFound();

  const windowStatus = await getReportingWindowStatus();
  const windowLocked = !windowStatus.isOpen && !isPrivileged;

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

  const html = renderReportHtml(report);
  const bodyMatch = html.match(/<body>([\s\S]*)<\/body>/);
  const bodyHtml = bodyMatch ? bodyMatch[1] : html;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Navigation & Actions Top Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-6 no-print">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            <Link href="/dashboard" className="hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span className="capitalize text-foreground font-semibold">{report.report_type} Report</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground capitalize">
            {report.report_type} Performance Report
          </h1>
        </div>

        <ReportActionButtons
          reportId={report.id}
          currentStatus={report.status}
          currentNotes={report.review_notes}
          isOwner={isOwner}
          isAdmin={isPrivileged}
          isSuperAdmin={user.role === "super_admin"}
          windowLocked={windowLocked}
        />
      </div>

      {/* Draft Notice for Author */}
      {report.status === "draft" && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-3 no-print">
          <IconSend size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Private In-Progress Draft</p>
            <p className="mt-0.5">
              This report is currently only visible to you. When you are ready for management review, click{" "}
              <strong>&quot;Submit to Management&quot;</strong> in the toolbar above to submit it to the Admin and CEO review queues.
            </p>
          </div>
        </div>
      )}

      {/* Executive Review Guidance Note Banner */}
      {report.review_notes && (
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-xs text-blue-900 dark:text-blue-200 no-print">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-bold flex items-center gap-1.5 text-blue-950 dark:text-blue-100">
              <IconMessageSquare size={14} className="text-blue-600 dark:text-blue-400" />
              Executive Leadership Feedback &amp; Directives
            </span>
            {report.reviewer_name && (
              <span className="text-[11px] text-blue-700 dark:text-blue-300">
                Reviewed by {report.reviewer_name}
              </span>
            )}
          </div>
          <p className="whitespace-pre-wrap leading-relaxed text-blue-900 dark:text-blue-200">
            {report.review_notes}
          </p>
        </div>
      )}

      {/* Governance Lifecycle Stepper */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-xs no-print">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
          {/* Step 1 */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
              ✓
            </div>
            <div>
              <p className="font-semibold text-foreground">Authored</p>
              <p className="text-[10px] text-muted-foreground" suppressHydrationWarning>
                {formatDate(report.created_at)}
              </p>
            </div>
          </div>

          <div
            className={`hidden sm:block h-0.5 flex-1 mx-3 ${
              report.status !== "draft" ? "bg-accent" : "bg-border"
            }`}
          />

          {/* Step 2 */}
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                report.status !== "draft"
                  ? "bg-accent text-accent-foreground"
                  : "bg-muted text-muted-foreground border border-border"
              }`}
            >
              {report.status !== "draft" ? "✓" : "2"}
            </div>
            <div>
              <p className="font-semibold text-foreground">Submitted to Leadership</p>
              <p className="text-[10px] text-muted-foreground">
                {report.status !== "draft" ? "In Executive Review Queue" : "Private Draft"}
              </p>
            </div>
          </div>

          <div
            className={`hidden sm:block h-0.5 flex-1 mx-3 ${
              report.status === "reviewed" ? "bg-blue-600 dark:bg-blue-500" : "bg-border"
            }`}
          />

          {/* Step 3 */}
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                report.status === "reviewed"
                  ? "bg-blue-600 dark:bg-blue-500 text-white"
                  : "bg-muted text-muted-foreground border border-border"
              }`}
            >
              {report.status === "reviewed" ? "✓" : "3"}
            </div>
            <div>
              <p className="font-semibold text-foreground">Executive Sign-off</p>
              <p className="text-[10px] text-muted-foreground">
                {report.status === "reviewed"
                  ? `Approved by ${report.reviewer_name || "Executive"}`
                  : "Awaiting Sign-off"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Executive Meta Card */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs no-print">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-xs">
          <div>
            <p className="text-muted-foreground font-medium">Prepared By</p>
            <div className="flex items-center gap-1.5 font-semibold text-foreground mt-1">
              <IconUser size={14} className="text-muted-foreground" />
              <span>{report.profiles?.full_name || "Employee"}</span>
            </div>
          </div>

          <div>
            <p className="text-muted-foreground font-medium">Department / Entity</p>
            <div className="flex items-center gap-1.5 font-semibold text-foreground mt-1">
              <IconBuilding size={14} className="text-muted-foreground" />
              <span>{report.profiles?.department || "Yetaf Holding"}</span>
            </div>
          </div>

          <div>
            <p className="text-muted-foreground font-medium">Reporting Window</p>
            <div className="flex items-center gap-1.5 font-semibold text-foreground mt-1 tabular-nums">
              <IconCalendar size={14} className="text-muted-foreground" />
              <span>
                {report.period_start} &rarr; {report.period_end}
              </span>
            </div>
          </div>

          <div>
            <p className="text-muted-foreground font-medium">Workflow Status</p>
            <div className="mt-1">
              <StatusBadge status={report.status} />
            </div>
          </div>
        </div>
      </div>

      {/* Official Document Rendering Sheet */}
      <div className="relative rounded-xl border border-border bg-card p-6 sm:p-12 shadow-sm report-render">
        {/* Subtle official watermark / header */}
        <div className="mb-6 flex items-center justify-between border-b-2 border-foreground/80 pb-4">
          <div>
            <p className="font-display text-base sm:text-lg font-bold tracking-tight text-foreground">
              YETAF HOLDING LIMITED
            </p>
            <p className="text-[10px] sm:text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Performance &amp; Governance Reporting
            </p>
          </div>
          <div className="text-right text-[11px] text-muted-foreground">
            <p className="font-mono">REF: YH-{report.id.slice(0, 8).toUpperCase()}</p>
            <p suppressHydrationWarning>{formatDate(report.created_at)}</p>
          </div>
        </div>

        <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      </div>
    </div>
  );
}
