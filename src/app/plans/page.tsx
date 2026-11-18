import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { ETHIOPIA_TIMEZONE } from "@/lib/windowSchedule";
import { AppShell } from "@/components/AppShell";
import { PlanWorkspace, type DirectiveOption } from "@/components/PlanWorkspace";
import type { ActionPlanRow } from "@/types/plan";

export const dynamic = "force-dynamic";

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ directive?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const isPrivileged = user.role === "admin" || user.role === "super_admin";

  const [planRows, directiveRows] = await Promise.all([
    isPrivileged
      ? sql`
          SELECT p.id, p.reference_code, p.user_id, p.directive_id, p.title, p.department,
                 to_char(p.period_start, 'YYYY-MM-DD') as period_start,
                 to_char(p.period_end, 'YYYY-MM-DD') as period_end,
                 p.entry_mode, p.objectives, p.summary, p.attachments, p.status,
                 p.review_notes, p.reviewed_by, p.reviewed_at, p.created_at, p.updated_at,
                 u.full_name as author_name, u.email as author_email,
                 rev.full_name as reviewer_name,
                 d.reference_code as directive_ref, d.title as directive_title
          FROM action_plans p
          JOIN users u ON p.user_id = u.id
          LEFT JOIN users rev ON p.reviewed_by = rev.id
          LEFT JOIN directives d ON p.directive_id = d.id
          ORDER BY p.created_at DESC;
        `
      : sql`
          SELECT p.id, p.reference_code, p.user_id, p.directive_id, p.title, p.department,
                 to_char(p.period_start, 'YYYY-MM-DD') as period_start,
                 to_char(p.period_end, 'YYYY-MM-DD') as period_end,
                 p.entry_mode, p.objectives, p.summary, p.attachments, p.status,
                 p.review_notes, p.reviewed_by, p.reviewed_at, p.created_at, p.updated_at,
                 u.full_name as author_name, u.email as author_email,
                 rev.full_name as reviewer_name,
                 d.reference_code as directive_ref, d.title as directive_title
          FROM action_plans p
          JOIN users u ON p.user_id = u.id
          LEFT JOIN users rev ON p.reviewed_by = rev.id
          LEFT JOIN directives d ON p.directive_id = d.id
          WHERE p.user_id = ${user.id}
          ORDER BY p.created_at DESC;
        `,
    sql`
      SELECT id, reference_code, title
      FROM directives
      WHERE status <> 'closed'
      ORDER BY created_at DESC
      LIMIT 50;
    `,
  ]);

  const plans: ActionPlanRow[] = planRows.map((p) => ({
    id: String(p.id),
    reference_code: String(p.reference_code),
    user_id: String(p.user_id),
    directive_id: p.directive_id ? String(p.directive_id) : null,
    directive_ref: p.directive_ref ? String(p.directive_ref) : null,
    directive_title: p.directive_title ? String(p.directive_title) : null,
    title: String(p.title),
    department: String(p.department),
    period_start: String(p.period_start),
    period_end: String(p.period_end),
    entry_mode: (p.entry_mode === "upload" ? "upload" : "form") as ActionPlanRow["entry_mode"],
    objectives: Array.isArray(p.objectives) ? p.objectives : [],
    summary: String(p.summary || ""),
    attachments: Array.isArray(p.attachments) ? p.attachments : [],
    status: p.status as ActionPlanRow["status"],
    review_notes: p.review_notes ? String(p.review_notes) : null,
    reviewed_by: p.reviewed_by ? String(p.reviewed_by) : null,
    reviewed_at: p.reviewed_at
      ? typeof p.reviewed_at === "string"
        ? p.reviewed_at
        : p.reviewed_at.toISOString()
      : null,
    author_name: p.author_name ? String(p.author_name) : null,
    author_email: p.author_email ? String(p.author_email) : null,
    reviewer_name: p.reviewer_name ? String(p.reviewer_name) : null,
    created_at:
      typeof p.created_at === "string" ? p.created_at : p.created_at.toISOString(),
    updated_at:
      typeof p.updated_at === "string" ? p.updated_at : p.updated_at.toISOString(),
  }));

  const directives: DirectiveOption[] = directiveRows.map((d) => ({
    id: String(d.id),
    reference_code: String(d.reference_code),
    title: String(d.title),
  }));

  const todayYmd = new Intl.DateTimeFormat("en-CA", {
    timeZone: ETHIOPIA_TIMEZONE,
  }).format(new Date());

  return (
    <AppShell
      user={user}
      title="Action Plan Center"
      subtitle="Submit, approve & track divisional action plans"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <div className="border-b border-border pb-5">
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Action Plan Submission Module
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-3xl">
            Author and submit structured ERP-ready action plans or upload official plan documents, link them to active directives, and track Direction approvals.
          </p>
        </div>

        <PlanWorkspace
          initialPlans={plans}
          directives={directives}
          defaultDepartment={user.department || "Operations & Logistics"}
          todayYmd={todayYmd}
          preselectedDirectiveId={params.directive}
        />
      </div>
    </AppShell>
  );
}

