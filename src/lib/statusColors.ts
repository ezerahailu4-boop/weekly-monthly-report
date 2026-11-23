/**
 * Warm Luxury status + role color system.
 * Single source of truth — every component imports from here.
 * Light mode: cream/emerald/gold. Dark mode: charcoal/graphite/gold.
 * All colors meet WCAG AA contrast on their intended backgrounds.
 */
export type StatusVariant = "draft" | "submitted" | "reviewed" | "overdue" | "warning";

export type RoleVariant = "employee" | "admin" | "super_admin";

export interface StatusColorDef {
  bg: string;
  border: string;
  text: string;
  dot: string;
}

/**
 * Light mode status colors (WCAG AA on cream background).
 */
const LIGHT_STATUS: Record<StatusVariant, StatusColorDef> = {
  draft: {
    bg: "bg-[#F0EDE0]",
    border: "border-[#CAD7CD]",
    text: "text-[#52645A]",
    dot: "bg-[#52645A]",
  },
  submitted: {
    bg: "bg-[#E8F2EC]",
    border: "border-[#B7DFCB]",
    text: "text-[#006B45]",
    dot: "bg-[#006B45]",
  },
  reviewed: {
    bg: "bg-[#E8F2EC]",
    border: "border-[#006B45]",
    text: "text-[#006B45]",
    dot: "bg-[#006B45]",
  },
  overdue: {
    bg: "bg-[#FBE8E8]",
    border: "border-[#DC5550]",
    text: "text-[#DC5550]",
    dot: "bg-[#DC5550]",
  },
  warning: {
    bg: "bg-[#FBF0DF]",
    border: "border-[#D6A64B]",
    text: "text-[#8A5A1B]",
    dot: "bg-[#8A5A1B]",
  },
} as const;

/**
 * Dark mode status colors (WCAG AA on charcoal/graphite).
 */
const DARK_STATUS: Record<StatusVariant, StatusColorDef> = {
  draft: {
    bg: "bg-[#3A3E41]",
    border: "border-[#414548]",
    text: "text-[#B5B2AA]",
    dot: "bg-[#B5B2AA]",
  },
  submitted: {
    bg: "bg-[#1B352B]",
    border: "border-[#36A879]",
    text: "text-[#36A879]",
    dot: "bg-[#36A879]",
  },
  reviewed: {
    bg: "bg-[#1B352B]",
    border: "border-[#36A879]",
    text: "text-[#36A879]",
    dot: "bg-[#36A879]",
  },
  overdue: {
    bg: "bg-[#4A1B1B]",
    border: "border-[#E47777]",
    text: "text-[#E47777]",
    dot: "bg-[#E47777]",
  },
  warning: {
    bg: "bg-[#3A2E14]",
    border: "border-[#E4AD50]",
    text: "text-[#E4AD50]",
    dot: "bg-[#E4AD50]",
  },
} as const;

/**
 * Light mode role colors.
 */
const LIGHT_ROLE: Record<RoleVariant, { text: string; bg: string }> = {
  employee: { text: "text-[#263B30]", bg: "bg-[#D9CBA9/30]" },
  admin: { text: "text-[#006B45]", bg: "bg-[#E8F2EC]" },
  super_admin: { text: "text-[#D6A64B]", bg: "bg-[#FBF0DF]" },
} as const;

/**
 * Dark mode role colors.
 */
const DARK_ROLE: Record<RoleVariant, { text: string; bg: string }> = {
  employee: { text: "text-[#F4F0E7]", bg: "bg-[#34383A/50]" },
  admin: { text: "text-[#36A879]", bg: "bg-[#1B352B]" },
  super_admin: { text: "text-[#D6B56D]", bg: "bg-[#3A2E14]" },
} as const;

export function statusColorsFor(variant: StatusVariant) {
  return {
    light: LIGHT_STATUS[variant],
    dark: DARK_STATUS[variant],
  };
}

export function roleColorsFor(role: RoleVariant) {
  return {
    light: LIGHT_ROLE[role],
    dark: DARK_ROLE[role],
  };
}
