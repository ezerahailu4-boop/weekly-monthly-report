"use client";

import { IconBuilding, IconCheckCircle, IconClock } from "./Icons";
import type { ReportRow } from "@/types/report";

interface DepartmentStat {
  name: string;
  totalReports: number;
  pendingReview: number;
  reviewed: number;
  latestPeriod?: string;
}

const HOLDING_DEPARTMENTS = [
  "Operations & Logistics",
  "Finance & Accounting",
  "Commercial & Sales",
  "Technology & Engineering",
  "Human Resources",
  "Legal & Governance",
  "Strategy & Business Dev",
];

export function HoldingDepartmentScorecard({
  reports,
  onSelectDepartment,
  selectedDepartment,
}: {
  reports: ReportRow[];
  onSelectDepartment?: (dept: string) => void;
  selectedDepartment?: string;
}) {
  const stats: DepartmentStat[] = HOLDING_DEPARTMENTS.map((dept) => {
    const deptReports = reports.filter(
      (r) => (r.author_department || r.profiles?.department) === dept
    );
    const pending = deptReports.filter((r) => r.status === "submitted").length;
    const reviewed = deptReports.filter((r) => r.status === "reviewed").length;
    const latest = deptReports[0]?.period_end;

    return {
      name: dept,
      totalReports: deptReports.length,
      pendingReview: pending,
      reviewed,
      latestPeriod: latest,
    };
  });

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs mb-6 sm:mb-8 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 border-b border-border pb-3 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <IconBuilding size={16} />
          </div>
          <div>
            <h3 className="font-display text-sm font-bold text-foreground">
              Subsidiary &amp; Department Performance Scorecard
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Real-time submission coverage across all business units of Yetaf Holding.
            </p>
          </div>
        </div>

        {selectedDepartment && selectedDepartment !== "all" && (
          <button
            type="button"
            onClick={() => onSelectDepartment?.("all")}
            className="text-[11px] font-semibold text-accent hover:underline self-start sm:self-auto"
          >
            Clear Filter ({selectedDepartment})
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {stats.map((s) => {
          const isSelected = selectedDepartment === s.name;
          const hasReports = s.totalReports > 0;
          const hasPending = s.pendingReview > 0;

          return (
            <button
              key={s.name}
              type="button"
              onClick={() => onSelectDepartment?.(isSelected ? "all" : s.name)}
              className={`rounded-lg border p-3 text-left transition-all text-xs ${
                isSelected
                  ? "border-accent bg-accent/10 text-foreground ring-1 ring-accent/30 shadow-xs"
                  : "border-border bg-muted/30 hover:bg-muted/70 hover:border-border text-foreground"
              }`}
            >
              <div className="flex items-start justify-between gap-1 mb-2">
                <span
                  className={`font-semibold text-xs leading-tight line-clamp-1 ${
                    isSelected ? "text-accent font-bold" : "text-foreground"
                  }`}
                  title={s.name}
                >
                  {s.name}
                </span>

                {hasPending ? (
                  <span className="shrink-0 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 tabular-nums">
                    <IconClock size={10} />
                    {s.pendingReview} review
                  </span>
                ) : hasReports ? (
                  <span className="shrink-0 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                    <IconCheckCircle size={9} />
                    Current
                  </span>
                ) : (
                  <span className="shrink-0 text-[10px] text-muted-foreground/60">
                    No files
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] tabular-nums">
                <span className="text-muted-foreground">
                  {s.totalReports} submission{s.totalReports === 1 ? "" : "s"}
                </span>
                {s.latestPeriod && (
                  <span className="font-mono text-[10px] text-muted-foreground/80">
                    thru {s.latestPeriod.slice(5)}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
