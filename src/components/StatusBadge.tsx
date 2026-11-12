import type { ReportStatus } from "@/types/report";

const variants = {
  draft:     "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400",
  submitted: "border-green-200 bg-green-50 text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-400",
  reviewed:  "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400",
  rejected:  "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400",
  default:   "border-border bg-muted text-muted-foreground",
} as const;

const dots = {
  draft:     "bg-amber-500",
  submitted: "bg-green-500",
  reviewed:  "bg-blue-500",
  rejected:  "bg-red-500",
  default:   "bg-muted-foreground",
} as const;

const labels: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  reviewed: "Reviewed",
  rejected: "Rejected",
  pending: "Pending",
  approved: "Approved",
};

export function StatusBadge({
  status,
  size = "md",
}: {
  status: ReportStatus | string;
  size?: "sm" | "md";
}) {
  const norm = (status || "").toLowerCase();
  const variantKey = (norm === "approved" ? "reviewed" : norm) as keyof typeof variants;
  const v = variants[variantKey] ?? variants.default;
  const d = dots[variantKey] ?? dots.default;
  const label = labels[norm] ?? norm.charAt(0).toUpperCase() + norm.slice(1);
  const px = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-0.5 text-xs";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${px} ${v}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${d}`} />
      {label}
    </span>
  );
}
