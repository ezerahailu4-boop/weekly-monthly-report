"use client";

import Link from "next/link";
import { StatCard } from "@/components/StatCard";
import { DashboardReportsTable } from "@/components/DashboardReportsTable";
import {
  IconCompass,
  IconDownload,
  IconLayers,
  IconPlus,
  IconTarget,
  IconCheckSquare,
} from "@/components/Icons";
import { Button } from "@/components/ui";

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
      {/* KPI skeleton row */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <StatCard key={i} title="Loading" value="—" loading />
        ))}
      </section>

      {/* Chart row skeletons */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm animate-pulse min-h-[260px]" />
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm animate-pulse min-h-[260px]" />
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm animate-pulse min-h-[260px]" />
      </div>

      {/* Table skeleton */}
      <DashboardReportsTable loading initialReports={[]} />
    </div>
  );
}
