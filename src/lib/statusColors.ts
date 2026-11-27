/**
 * Status and role colors stay within the shared navy, white, and gold palette.
 * The same token classes adapt to light and dark themes.
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
    bg: "bg-muted",
    border: "border-border",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  submitted: {
    bg: "bg-brand/10",
    border: "border-brand/30",
    text: "text-brand",
    dot: "bg-brand",
  },
  reviewed: {
    bg: "bg-brand/10",
    border: "border-brand/30",
    text: "text-brand",
    dot: "bg-brand",
  },
  overdue: {
    bg: "bg-accent/10",
    border: "border-accent/40",
    text: "text-accent-strong",
    dot: "bg-accent",
  },
  warning: {
    bg: "bg-accent/10",
    border: "border-accent/40",
    text: "text-accent-strong",
    dot: "bg-accent",
  },
};

const ROLE_COLORS: Record<RoleVariant, { text: string; bg: string }> = {
  employee: { text: "text-foreground", bg: "bg-secondary" },
  admin: { text: "text-brand", bg: "bg-brand/10" },
  super_admin: { text: "text-accent-strong", bg: "bg-accent/10" },
};

export function statusColorsFor(variant: StatusVariant) {
  const colors = STATUS_COLORS[variant];
  return { light: colors, dark: colors };
}

export function roleColorsFor(role: RoleVariant) {
  const colors = ROLE_COLORS[role];
  return { light: colors, dark: colors };
}
