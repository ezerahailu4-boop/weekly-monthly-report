"use client";

import React from "react";

export type BadgeVariant =
  | "default"
  | "brand"
  | "success"
  | "warning"
  | "destructive"
  | "info"
  | "outline"
  | "muted";

export type BadgeSize = "sm" | "md";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  pulse?: boolean;
  icon?: React.ReactNode;
}

const badgeVariants: Record<BadgeVariant, { container: string; dot: string }> = {
  default: {
    container: "border-border bg-muted/60 text-foreground",
    dot: "bg-muted-foreground",
  },
  brand: {
    // Primary accent (indigo) — brand colour, never used for status semantics.
    container:
      "border-indigo-100 bg-indigo-50 text-indigo-700 font-semibold dark:border-indigo-400 dark:bg-indigo-900/20 dark:text-indigo-300",
    dot: "bg-indigo-600",
  },
  success: {
    container:
      "border-success-300 bg-success-50 text-success-700 font-semibold dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-300",
    dot: "bg-success-600",
  },
  warning: {
    container:
      "border-warning-300 bg-warning-50 text-warning-700 font-semibold dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-300",
    dot: "bg-warning-600",
  },
  destructive: {
    container:
      "border-destructive-300 bg-destructive-50 text-destructive-700 font-semibold dark:border-destructive-500/30 dark:bg-destructive-500/10 dark:text-destructive-300",
    dot: "bg-destructive-600",
  },
  info: {
    container:
      "border-indigo-100 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-900/20 dark:text-indigo-300",
    dot: "bg-indigo-600",
  },
  outline: {
    container: "border-border bg-card text-foreground",
    dot: "bg-foreground",
  },
  muted: {
    container: "border-transparent bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
  },
};

export function Badge({
  variant = "default",
  size = "md",
  dot = false,
  pulse = false,
  icon,
  children,
  className = "",
  ...props
}: BadgeProps) {
  const styling = badgeVariants[variant] ?? badgeVariants.default;
  const sizeClasses =
    size === "sm"
      ? "px-2 py-0.5 text-[11px] leading-tight"
      : "px-2.5 py-0.5 text-xs font-medium";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border transition-colors duration-150 select-none ${sizeClasses} ${styling.container} ${className}`}
      {...props}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          {pulse && (
            <span
              className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${styling.dot}`}
            />
          )}
          <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${styling.dot}`} />
        </span>
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
}

/**
 * Universal Status Badge supporting Directives, Tasks, Plans, Reports, and Priorities.
 * Colour is never the only signal: every status has an explicit text label.
 */
export function StatusBadge({
  status,
  size = "md",
  className = "",
}: {
  status: string;
  size?: BadgeSize;
  className?: string;
}) {
  const norm = (status || "").toLowerCase().trim();

  let variant: BadgeVariant = "default";
  let label = status;
  let pulse = false;

  switch (norm) {
    // Directives / Plans
    case "open":
      variant = "brand";
      label = "Open";
      break;
    case "in_progress":
      variant = "info";
      label = "In Progress";
      break;
    case "closed":
    case "completed":
      variant = "success";
      label = "Completed";
      break;
    case "cancelled":
      variant = "muted";
      label = "Cancelled";
      break;
    case "overdue":
    case "breached":
      variant = "destructive";
      label = "Overdue";
      pulse = true;
      break;

    // Reports
    case "draft":
      variant = "warning";
      label = "Draft";
      break;
    case "submitted":
      variant = "success";
      label = "Submitted";
      break;
    case "reviewed":
    case "approved":
      variant = "info";
      label = "Reviewed";
      break;
    case "rejected":
      variant = "destructive";
      label = "Rejected";
      break;

    // Priorities
    case "urgent":
      variant = "destructive";
      label = "Urgent";
      pulse = true;
      break;
    case "high":
      variant = "warning";
      label = "High";
      break;
    case "medium":
      variant = "default";
      label = "Medium";
      break;
    case "low":
      variant = "muted";
      label = "Low";
      break;

    default:
      variant = "default";
      label = norm ? norm.charAt(0).toUpperCase() + norm.slice(1) : "—";
      break;
  }

  return (
    <Badge variant={variant} size={size} dot pulse={pulse} className={className}>
      {label}
    </Badge>
  );
}
