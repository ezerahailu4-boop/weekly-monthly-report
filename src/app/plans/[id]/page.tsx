import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { AppShell } from "@/components/AppShell";
import { PlanDetailInteractive } from "@/components/PlanDetailInteractive";
import {
  IconArrowLeft,
  IconBuilding,
  IconCalendar,
  IconCompass,
  IconDownload,
  IconPaperclip,
  IconPrinter,
} from "@/components/Icons";
import type { ActionPlanRow } from "@/types/plan";

export const dynamic = "force-dynamic";

export default async function PlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const rows = await sql`
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
    WHERE p.id = ${id}
    LIMIT 1;
  `;

  if (rows.length === 0) notFound();
  const p = rows[0];
  const isPrivileged = user.role === "admin" || user.role === "super_admin";
  const isOwner = p.user_id === user.id;
  if (!isPrivileged && !isOwner) notFound();

  const plan: ActionPlanRow = {
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
  };

  return (
    <AppShell
      user={user}
      title={plan.reference_code}
      subtitle="Action Plan Review & Tracking"
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs">
              <Link
                href="/plans"
                className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground font-semibold"
              >
                <IconArrowLeft size={13} />
                Action Plans
              </Link>
              <span className="text-muted-foreground">/</span>
              <span className="font-mono font-bold text-accent">{plan.reference_code}</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-foreground">
              {plan.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 font-medium text-foreground">
                <IconBuilding size={13} />
                {plan.department}
              </span>
              <span>Prepared by {plan.author_name}</span>
              <span className="inline-flex items-center gap-1">
                <IconCalendar size={13} />
                {plan.period_start} → {plan.period_end}
              </span>
              {plan.directive_id && plan.directive_ref && (
                <Link
                  href={`/directives/${plan.directive_id}`}
                  className="inline-flex items-center gap-1 font-semibold text-accent hover:underline"
                >
                  <IconCompass size={13} />
                  Directive {plan.directive_ref}
                </Link>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`/api/plans/${plan.id}/export?format=pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"
            >
              <IconPrinter size={13} />
              PDF Letterhead
            </a>
            <a
              href={`/api/plans/${plan.id}/export?format=docx`}
              download
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
            >
              <IconDownload size={13} />
              DOCX Letterhead
            </a>
          </div>
        </div>

        {plan.summary && (
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Plan Executive Overview
            </h2>
            <p className="text-xs sm:text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
              {plan.summary}
            </p>
          </div>
        )}

        {plan.attachments.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Uploaded Plan Documents
            </h2>
            <div className="flex flex-wrap gap-2">
              {plan.attachments.map((att) => (
                <a
                  key={att.id}
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                >
                  <IconPaperclip size={12} className="text-accent" />
                  {att.file_name}
                </a>
              ))}
            </div>
          </div>
        )}

        {plan.review_notes && (
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-xs text-blue-900 dark:text-blue-200 space-y-1">
            <p className="font-bold">
              Direction Review Notes
              {plan.reviewer_name ? ` — ${plan.reviewer_name}` : ""}
            </p>
            <p className="whitespace-pre-wrap">{plan.review_notes}</p>
          </div>
        )}

        <PlanDetailInteractive
          initialPlan={plan}
          canEdit={isOwner || isPrivileged}
          isPrivileged={isPrivileged}
        />
      </div>
    </AppShell>
  );
}

