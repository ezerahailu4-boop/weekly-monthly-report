"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Skeleton } from "@/components/ui/Skeleton";

interface StatCardProps {
  title: string;
  value: string | number;
  caption?: string;
  delta?: string;
  deltaPositive?: boolean;
  deltaLabel?: string;
  icon?: React.ReactNode;
  loading?: boolean;
}

export function StatCard({
  title,
  value,
  caption,
  delta,
  deltaPositive,
  deltaLabel,
  icon,
  loading = false,
}: StatCardProps) {
  const isDeltaNegative = deltaPositive === false;
  const deltaColor = isDeltaNegative ? "text-destructive-600" : "text-success-600";
  const arrow = isDeltaNegative ? "▼" : "▲";

  const formattedValue =
    typeof value === "number" ? new Intl.NumberFormat("en-US").format(value) : String(value);

  if (loading) {
    return (
      <Card className="shadow-sm" hoverable>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="animate-pulse rounded-lg bg-muted h-4 w-1/3 text-muted-foreground" />
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-8 w-1/2 tabular-nums font-bold" />
            <Skeleton className="h-4 w-2/3" />
            {delta && (
              <div className="flex items-center gap-1.5 w-1/3">
                <Skeleton className="h-3 w-3 rounded-full" />
                <Skeleton className="h-3.5 w-3/4" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className="group hoverable shadow-sm hover:shadow-md transition-all duration-200"
      hoverable
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-[12px] font-semibold leading-none tracking-tight uppercase text-muted-foreground">
          {title}
        </CardTitle>
        {icon && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="stat-card">
          <span className="stat-value text-[28px] font-bold tabular-nums text-foreground tracking-tight">
            {formattedValue}
          </span>
          {caption && <p className="stat-label mt-0.5 text-[12px] font-medium text-muted-foreground leading-none">
            {caption}
          </p>}
        </div>
        {delta && (
          <div className={`mt-3 inline-flex items-center gap-1.5 ${deltaColor} rounded-lg px-3 py-1.5 text-xs font-medium`}>
            <span className={arrow === "▼" ? "text-destructive-600" : "text-success-600"} aria-hidden="true">
              {arrow}
            </span>
            <span className="tabular-nums">{delta}</span>
            <span className="text-muted-foreground">{deltaLabel ?? "since last week"}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
