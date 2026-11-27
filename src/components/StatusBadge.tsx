import { statusColorsFor } from "@/lib/statusColors";

type StatusKey = "draft" | "submitted" | "reviewed" | "overdue" | "warning";

export function StatusBadge({
  status,
  size = "md",
}: {
  status: string;
  size?: "sm" | "md";
}) {
  const norm = (status || "draft").toLowerCase();
  const key = (["draft", "submitted", "reviewed", "overdue", "warning"] as const).includes(
    norm as StatusKey
  )
    ? (norm as StatusKey)
    : "draft";
  const { light, dark } = statusColorsFor(key);
  const label =
    {
      draft: "Draft",
      submitted: "Submitted",
      reviewed: "Reviewed",
      overdue: "Overdue",
      warning: "Warning",
    }[norm] ||
    norm.charAt(0).toUpperCase() + norm.slice(1);
  const px = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-0.5 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${px} ${light.bg} ${dark.bg.replace("bg-", "dark:bg-")} ${light.border} ${dark.border.replace("border-", "dark:border-")} ${light.text} ${dark.text.replace("text-", "dark:text-")}`}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${light.dot} ${dark.dot.replace("bg-", "dark:bg-")}`}
      />
      {label}
    </span>
  );
}
