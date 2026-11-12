import Link from "next/link";
import { IconCheckSquare, IconClock, IconLock, IconShield } from "./Icons";
import type { ReportingWindowStatus } from "@/lib/windowSchedule";

export function ReportingWindowBanner({
  status,
  isPrivileged = false,
}: {
  status: ReportingWindowStatus;
  isPrivileged?: boolean;
}) {
  const isOpen = status.isOpen;

  return (
    <div
      className={`rounded-xl border p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-colors ${
        isOpen
          ? "border-emerald-500/30 bg-emerald-500/10"
          : "border-amber-500/30 bg-amber-500/10"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            isOpen
              ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300"
              : "bg-amber-500/20 text-amber-800 dark:text-amber-300"
          }`}
        >
          {isOpen ? <IconClock size={18} /> : <IconLock size={18} />}
        </div>

        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                isOpen
                  ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/30"
                  : "bg-amber-500/15 text-amber-900 dark:text-amber-200 border-amber-500/30"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isOpen ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                }`}
              />
              {isOpen ? "Reporting Window OPEN" : "Reporting Window CLOSED"}
            </span>

            <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
              {status.currentEthTimeLabel}
            </span>
          </div>

          <p className="text-xs sm:text-sm font-semibold text-foreground">
            {status.countdownLabel}
          </p>

          <p className="text-[11px] text-muted-foreground">
            Schedule: Opens <strong className="text-foreground">{status.openLabel}</strong> &rarr; Closes{" "}
            <strong className="text-foreground">{status.closeLabel}</strong>
            {!isOpen && !isPrivileged && (
              <> · Staff report submissions are locked until reopening; your Tasks remain accessible anytime.</>
            )}
            {isPrivileged && !isOpen && (
              <> · Leadership override active: Admins &amp; CEO keep full access anytime.</>
            )}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {isPrivileged ? (
          <Link
            href="/admin?tab=settings"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted shadow-2xs transition-colors"
          >
            <IconShield size={13} className="text-muted-foreground" />
            Configure Schedule
          </Link>
        ) : (
          <Link
            href="/tasks"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted shadow-2xs transition-colors"
          >
            <IconCheckSquare size={13} className="text-accent" />
            View My Tasks
          </Link>
        )}
      </div>
    </div>
  );
}

export function ReportingWindowLockedView({
  status,
}: {
  status: ReportingWindowStatus;
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-12 sm:py-16">
      <div className="rounded-xl border border-border bg-card p-6 sm:p-10 text-center shadow-sm space-y-5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          <IconLock size={26} />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-300 border border-amber-500/20">
            Reporting Submissions Closed
          </span>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">
            Outside Scheduled Reporting Hours
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
            New report creation, editing, and submission are closed in Ethiopian Time (EAT).{" "}
            <strong className="text-foreground">{status.countdownLabel}</strong>.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-muted/40 p-4 text-xs space-y-1.5 text-left max-w-md mx-auto">
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Current Time (EAT):</span>
            <span className="font-mono font-semibold text-foreground tabular-nums">
              {status.currentEthTimeLabel}
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Opens:</span>
            <span className="font-semibold text-foreground">{status.openLabel}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Closes:</span>
            <span className="font-semibold text-foreground">{status.closeLabel}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
          >
            Back to Dashboard
          </Link>
          <Link
            href="/tasks"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-all"
          >
            <IconCheckSquare size={14} />
            Open My Assigned Tasks
          </Link>
        </div>
      </div>
    </div>
  );
}

