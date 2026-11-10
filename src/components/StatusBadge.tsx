import { IconCheckCircle, IconClock } from "./Icons";
import type { ReportStatus } from "@/types/report";

export function StatusBadge({
  status,
  size = "md",
}: {
  status: ReportStatus | string;
  size?: "sm" | "md";
}) {
  const norm = (status || "").toLowerCase();
  const sizeClasses =
    size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-0.5 text-xs";

  if (norm === "draft" || norm === "pending") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full font-medium border transition-colors ${sizeClasses} bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
        <span>{norm === "draft" ? "Draft" : "Pending"}</span>
      </span>
    );
  }

  if (norm === "reviewed" || norm === "approved") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full font-medium border transition-colors ${sizeClasses} bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20`}
      >
        <IconCheckCircle size={size === "sm" ? 11 : 13} className="text-blue-600 dark:text-blue-400 shrink-0" />
        <span>Reviewed</span>
      </span>
    );
  }

  if (norm === "late" || norm === "blocked" || norm === "rejected" || norm === "critical") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full font-medium border transition-colors ${sizeClasses} bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
        <span className="capitalize">{norm}</span>
      </span>
    );
  }

  if (norm === "missing" || norm === "inactive") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full font-medium border transition-colors ${sizeClasses} bg-muted text-muted-foreground border-border`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground shrink-0" />
        <span className="capitalize">{norm}</span>
      </span>
    );
  }

  // Default to "submitted" / green
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium border transition-colors ${sizeClasses} bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
      <span>Submitted</span>
    </span>
  );
}
