import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { AdminUserManagement, type TeamMember } from "@/components/AdminUserManagement";
import { DashboardReportsTable } from "@/components/DashboardReportsTable";
import { AppShell } from "@/components/AppShell";
import {
  IconCrown,
  IconFileText,
  IconShield,
  IconUser,
} from "@/components/Icons";
import type { ReportRow } from "@/types/report";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
  }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const isSuperAdmin = user.role === "super_admin";
  const isAdmin = user.role === "admin";
  if (!isAdmin && !isSuperAdmin) redirect("/dashboard");

  const params = await searchParams;
  const activeTab = params.tab === "reports" ? "reports" : "team";

  // Query team members and reports in parallel from Neon
  const [teamRows, reportRows] = await Promise.all([
    sql`
      SELECT id, email, full_name, department, role, created_at
      FROM users
      ORDER BY created_at DESC;
    `,
    sql`
      SELECT r.id, r.user_id, r.report_type,
             to_char(r.period_start, 'YYYY-MM-DD') as period_start,
             to_char(r.period_end, 'YYYY-MM-DD') as period_end,
             r.status, r.data, r.review_notes, r.reviewed_by, r.reviewed_at,
             r.created_at, r.updated_at,
             u.full_name as author_name, u.department as author_department, u.email as author_email,
             rev.full_name as reviewer_name
      FROM reports r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN users rev ON r.reviewed_by = rev.id
      ORDER BY r.created_at DESC;
    `,
  ]);

  const allReports: ReportRow[] = reportRows.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    report_type: r.report_type,
    period_start: r.period_start,
    period_end: r.period_end,
    status: r.status,
    data: r.data,
    created_at: typeof r.created_at === "string" ? r.created_at : r.created_at.toISOString(),
    updated_at: typeof r.updated_at === "string" ? r.updated_at : r.updated_at.toISOString(),
    author_name: r.author_name,
    author_department: r.author_department,
    author_email: r.author_email,
    review_notes: r.review_notes,
    reviewed_by: r.reviewed_by,
    reviewed_at: r.reviewed_at ? (typeof r.reviewed_at === "string" ? r.reviewed_at : r.reviewed_at.toISOString()) : null,
    reviewer_name: r.reviewer_name,
    profiles: {
      full_name: r.author_name,
      department: r.author_department,
    },
  }));

  const teamList: TeamMember[] = teamRows.map((t) => ({
    id: t.id,
    email: t.email,
    full_name: t.full_name,
    department: t.department,
    role: t.role as "employee" | "admin" | "super_admin",
    created_at: typeof t.created_at === "string" ? t.created_at : t.created_at.toISOString(),
  }));

  return (
    <AppShell
      user={user}
      title={isSuperAdmin ? "CEO Governance Console" : "Admin Console"}
      subtitle="Corporate Governance & User Provisioning"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-3 border-b border-border pb-6">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {isSuperAdmin ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-950 px-2.5 py-0.5 text-[11px] font-bold text-amber-300 ring-1 ring-amber-500/30">
                <IconCrown size={12} className="text-amber-400" />
                Office of the CEO &amp; Board
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-bold text-primary-foreground">
                <IconShield size={12} />
                Executive Administration
              </span>
            )}
            <span>&middot;</span>
            <span>Corporate Governance &amp; User Provisioning</span>
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            {isSuperAdmin ? "CEO Executive Governance Console" : "Administrator Governance Console"}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-3xl">
            {isSuperAdmin
              ? "Oversee user accounts, assign executive & managerial privileges, and inspect performance reporting submissions across all subsidiaries."
              : "Manage and provision corporate employee accounts and review performance report submissions across departments."}
          </p>

          {/* Segmented Tab Control */}
          <div className="mt-4 inline-flex h-10 items-center rounded-lg bg-muted p-1 text-muted-foreground text-xs w-fit border border-border/60">
            <Link
              href="/admin?tab=team"
              className={`inline-flex items-center gap-2 rounded-md px-4 py-1.5 font-semibold transition-all ${
                activeTab === "team"
                  ? "bg-card text-foreground shadow-2xs"
                  : "hover:text-foreground"
              }`}
            >
              <IconUser size={14} />
              <span>User Accounts ({teamList.length})</span>
            </Link>

            <Link
              href="/admin?tab=reports"
              className={`inline-flex items-center gap-2 rounded-md px-4 py-1.5 font-semibold transition-all ${
                activeTab === "reports"
                  ? "bg-card text-foreground shadow-2xs"
                  : "hover:text-foreground"
              }`}
            >
              <IconFileText size={14} />
              <span>Group Reports Oversight ({allReports.length})</span>
            </Link>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "team" ? (
          <AdminUserManagement initialTeam={teamList} currentUserRole={user.role} />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <IconFileText size={18} className="text-muted-foreground" />
                <span>All Group Submissions &amp; Reports</span>
              </h2>
              <span className="text-xs text-muted-foreground font-mono tabular-nums">
                {allReports.length} records available
              </span>
            </div>

            <DashboardReportsTable
              initialReports={allReports}
              showAuthor={true}
              isPrivileged={true}
            />
          </div>
        )}
      </div>
    </AppShell>
  );
}
