import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { formatEthDateLabel, getWarningById } from "@/lib/warnings";
import { AppShell } from "@/components/AppShell";
import { WarningLetterActions } from "@/components/WarningLetterActions";
import {
  IconAlertCircle,
  IconArrowLeft,
  IconCheckCircle,
  IconFileText,
  IconSend,
} from "@/components/Icons";

export const dynamic = "force-dynamic";

export default async function WarningLetterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const warning = await getWarningById(id);
  if (!warning) notFound();

  const isPrivileged = user.role === "admin" || user.role === "super_admin";
  const isOwner = warning.user_id === user.id;
  if (!isPrivileged && !isOwner) redirect("/dashboard");

  const priorRows = await sql`
    SELECT id, period_label, warning_level, created_at
    FROM disciplinary_warnings
    WHERE user_id = ${warning.user_id}
      AND status <> 'revoked'
      AND id <> ${warning.id}
      AND created_at <= ${warning.created_at}::timestamptz
    ORDER BY created_at ASC
    LIMIT 1;
  `;
  const priorWarning = priorRows[0] || null;

  const isWrittenLetter = warning.warning_level === "written_letter";
  const reportTitle =
    warning.report_type === "monthly"
      ? "Monthly Progress Report"
      : "Weekly Performance Report";
  const paragraphs = (warning.letter_body || "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <AppShell
      user={user}
      title={isWrittenLetter ? "Official Written Warning Letter" : "Verbal Warning Notice"}
      subtitle="Corporate Compliance Record"
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Back link + Actions */}
        <div className="print:hidden flex flex-col gap-4 border-b border-border pb-5">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground w-fit"
          >
            <IconArrowLeft size={14} />
            Back to Dashboard
          </Link>

          <WarningLetterActions
            warningId={warning.id}
            warningLevel={warning.warning_level}
            status={warning.status}
            isOwner={isOwner}
            isPrivileged={isPrivileged}
          />
        </div>

        {/* Official Document Sheet */}
        <article className="rounded-2xl border border-border bg-card p-6 sm:p-10 shadow-sm print:border-none print:shadow-none print:p-0 space-y-8">
          {/* Executive Letterhead */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b-2 border-amber-500/60 pb-6">
            <div className="flex items-center gap-3.5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-border bg-white p-1.5 shadow-2xs">
                <Image
                  src="/logo.jpg"
                  alt="YETAF Holding Limited"
                  width={96}
                  height={96}
                  className="h-full w-full object-contain"
                />
              </div>
              <div>
                <h1 className="font-display text-lg sm:text-xl font-extrabold tracking-tight text-foreground">
                  YETAF HOLDING LIMITED
                </h1>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Office of Executive Administration &amp; Human Resources · Addis Ababa
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:items-end gap-1">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold border ${
                  isWrittenLetter
                    ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
                    : "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30"
                }`}
              >
                {isWrittenLetter ? (
                  <IconFileText size={12} />
                ) : (
                  <IconAlertCircle size={12} />
                )}
                {isWrittenLetter
                  ? `STRIKE #${warning.strike_number} · WRITTEN WARNING LETTER`
                  : "STRIKE #1 · VERBAL WARNING"}
              </span>

              <span className="text-[11px] font-mono text-muted-foreground">
                {warning.letter_ref || `YH-VW-${warning.id.slice(0, 8).toUpperCase()}`}
              </span>
            </div>
          </div>

          {/* Status Banner if Acknowledged / Revoked */}
          {warning.status !== "active" && (
            <div
              className={`rounded-lg border px-4 py-3 text-xs font-medium flex items-center gap-2 ${
                warning.status === "acknowledged"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                  : "border-border bg-muted/60 text-muted-foreground"
              }`}
            >
              <IconCheckCircle size={14} />
              {warning.status === "acknowledged"
                ? `Employee acknowledged receipt on ${formatEthDateLabel(
                    warning.acknowledged_at
                  )}.`
                : "This warning record has been revoked by Administration and is excluded from active strikes."}
            </div>
          )}

          {/* Details Grid */}
          <div className="grid gap-3 sm:grid-cols-2 rounded-xl border border-border bg-muted/30 p-4 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Employee Name
              </span>
              <p className="font-semibold text-foreground mt-0.5">
                {warning.employee_name || warning.employee_email}
              </p>
              <p className="text-muted-foreground">{warning.employee_email}</p>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Department &amp; Date Issued
              </span>
              <p className="font-semibold text-foreground mt-0.5">
                {warning.employee_department || "Operations"}
              </p>
              <p className="text-muted-foreground">
                {formatEthDateLabel(warning.created_at)}
              </p>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Missed Submission
              </span>
              <p className="font-semibold text-foreground mt-0.5">{reportTitle}</p>
              <p className="text-muted-foreground">
                {warning.period_label} ({warning.period_start} to {warning.period_end})
              </p>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Telegram Delivery Status
              </span>
              <p className="mt-0.5 flex items-center gap-1.5 font-medium">
                <IconSend size={12} className="text-sky-500" />
                {warning.telegram_sent_at ? (
                  <span className="text-emerald-700 dark:text-emerald-300">
                    Delivered on {formatEthDateLabel(warning.telegram_sent_at)}
                  </span>
                ) : (
                  <span className="text-amber-700 dark:text-amber-300">
                    {warning.telegram_error || "Not delivered via Telegram"}
                  </span>
                )}
              </p>
            </div>

            {priorWarning && (
              <div className="sm:col-span-2 border-t border-border/60 pt-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Prior 1st Offense Reference
                </span>
                <p className="text-foreground font-medium mt-0.5">
                  Verbal Warning issued on {formatEthDateLabel(priorWarning.created_at)} for{" "}
                  {String(priorWarning.period_label)}
                </p>
              </div>
            )}
          </div>

          {/* Letter Subject & Body */}
          <div className="space-y-4">
            <h2 className="font-display text-base sm:text-lg font-bold text-foreground underline decoration-border underline-offset-4">
              {warning.letter_subject}
            </h2>

            <div className="space-y-4 text-sm leading-relaxed text-foreground/90">
              {paragraphs.map((p, idx) => (
                <p key={idx}>{p}</p>
              ))}
            </div>
          </div>

          {/* Signature Footer */}
          <div className="border-t border-border pt-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 text-xs">
            <div>
              <p className="text-muted-foreground">Issued By:</p>
              <p className="font-bold text-foreground mt-2 text-sm">
                {warning.issued_by_name ||
                  (warning.trigger_source === "auto"
                    ? "Automated Compliance Enforcement System"
                    : "Executive Administration & HR")}
              </p>
              <p className="text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider text-[11px]">
                YETAF HOLDING LIMITED
              </p>
            </div>

            <div className="text-muted-foreground text-[11px] sm:text-right">
              <p>CC: Office of the Chief Executive Officer</p>
              <p>Personnel Compliance File</p>
            </div>
          </div>
        </article>
      </div>
    </AppShell>
  );
}

