/**
 * Status and role colours for the light theme.
 * Statuses use semantic colours only: green (success), amber (pending/draft), red (overdue/error).
 * Brand surfaces use indigo. Values adapt to theme via Tailwind semantic classes.
 */
export type StatusVariant = "draft" | "submitted" | "reviewed" | "overdue" | "warning";

export type RoleVariant = "employee" | "admin" | "super_admin";

export interface StatusColorDef {
  bg: string;
  border: string;
  text: string;
  dot: string;
}

const STATUS_COLORS: Record<StatusVariant, StatusColorDef> = {
  draft: {
    bg: "bg-warning-50",
    border: "border-warning-300",
    text: "text-warning-700",
    dot: "bg-warning-600",
  },
  submitted: {
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    text: "text-indigo-700",
    dot: "bg-indigo-600",
  },
  reviewed: {
    bg: "bg-success-50",
    border: "border-success-300",
    text: "text-success-700",
    dot: "bg-success-600",
  },
  overdue: {
    bg: "bg-destructive-50",
    border: "border-destructive-300",
    text: "text-destructive-700",
    dot: "bg-destructive-600",
  },
  warning: {
    bg: "bg-warning-50",
    border: "border-warning-300",
    text: "text-warning-700",
    dot: "bg-warning-600",
  },
};

const ROLE_COLORS: Record<RoleVariant, { text: string; bg: string }> = {
  employee: { text: "text-foreground", bg: "bg-secondary" },
  admin: { text: "text-indigo-700", bg: "bg-indigo-50" },
  super_admin: { text: "text-indigo-700", bg: "bg-indigo-50" },
};

export function statusColorsFor(variant: StatusVariant) {
  const colors = STATUS_COLORS[variant];
  return { light: colors, dark: colors };
}

export function roleColorsFor(role: RoleVariant) {
  const colors = ROLE_COLORS[role];
  return { light: colors, dark: colors };
}
