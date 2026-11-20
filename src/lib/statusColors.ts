/**
 * Executive Emerald + Slate status color map.
 * Used across report tables, directive cards, warning letters, and dashboards
 * so every status reads consistently — light and dark safe.
 */
export type StatusVariant = "draft" | "submitted" | "reviewed" | "overdue" | "warning";

export const statusColors: Record<
  StatusVariant,
  { bg: string; border: string; text: string; dot: string }
> = {
  draft: {
    bg: "bg-muted/50",
    border: "border-muted",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  submitted: {
    bg: "bg-brand/10",
    border: "border-brand/20",
    text: "text-brand",
    dot: "bg-brand",
  },
  reviewed: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    text: "text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  overdue: {
    bg: "bg-destructive/10",
    border: "border-destructive/20",
    text: "text-destructive",
    dot: "bg-destructive",
  },
  warning: {
    bg: "bg-accent/10",
    border: "border-accent/20",
    text: "text-accent",
    dot: "bg-accent",
  },
} as const;

export function statusColorsFor(variant: StatusVariant) {
  return statusColors[variant];
}

/**
 * Role-based accent tints for chips and role labels.
 */
export type RoleVariant = "employee" | "admin" | "super_admin";

export const roleColors: Record<RoleVariant, { text: string; bg: string }> = {
  employee: { text: "text-slate-600 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-800/50" },
  admin: { text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
  super_admin: { text: "text-accent dark:text-accent", bg: "bg-accent-foreground/10 dark:bg-accent/10" },
} as const;

export function roleColorsFor(role: RoleVariant) {
  return roleColors[role];
}
