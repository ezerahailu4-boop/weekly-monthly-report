"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import {
  IconCalendar,
  IconDownload,
  IconEdit,
  IconEye,
  IconFileText,
  IconMessageSquare,
  IconPlus,
  IconSearch,
  IconTrash,
  IconUser,
} from "@/components/Icons";
import type { ReportRow } from "@/types/report";
import { formatDate } from "@/lib/dateUtils";
import { HoldingDepartmentScorecard } from "@/components/HoldingDepartmentScorecard";

export function DashboardReportsTable({
  initialReports,
  showAuthor = false,
  isPrivileged = false,
}: {
  initialReports: ReportRow[];
  showAuthor?: boolean;
  isPrivileged?: boolean;
}) {
  const router = useRouter();
  const [reports, setReports] = useState<ReportRow[]>(initialReports);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Extract unique departments for filter dropdown
  const departments = Array.from(
    new Set(
      reports
        .map((r) => r.author_department || r.profiles?.department)
        .filter(Boolean) as string[]
    )
  );

  const filtered = reports.filter((r) => {
    const matchesType = typeFilter === "all" || r.report_type === typeFilter;
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    const dept = r.author_department || r.profiles?.department || "";
    const matchesDept = departmentFilter === "all" || dept === departmentFilter;
    const author = r.author_name || r.profiles?.full_name || "";
    const matchesSearch =
      r.period_start.includes(search) ||
      r.period_end.includes(search) ||
      r.report_type.toLowerCase().includes(search.toLowerCase()) ||
      author.toLowerCase().includes(search.toLowerCase()) ||
      dept.toLowerCase().includes(search.toLowerCase());

    return matchesType && matchesStatus && matchesDept && matchesSearch;
  });

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this report? This cannot be undone.")) {
      return;
    }
    setDeletingId(id);
    try {
      const res = await fetch(`/api/reports/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok && json.success) {
        setReports((prev) => prev.filter((r) => r.id !== id));
        router.refresh();
      } else {
        alert("Failed to delete report: " + (json.error || "Unknown error"));
      }
    } catch (err: unknown) {
      alert("Failed to delete report: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* CEO & Executive Subsidiary Performance Scorecard */}
      {showAuthor && (
        <HoldingDepartmentScorecard
          reports={reports}
          selectedDepartment={departmentFilter}
          onSelectDepartment={(dept) => setDepartmentFilter(dept)}
        />
      )}

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1 max-w-sm">
          <IconSearch
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Filter by keyword, period, or author..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-8 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all shadow-2xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
            >
              &times;
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Department Filter (for CEO / Admin) */}
          {showAuthor && departments.length > 0 && (
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground shadow-2xs focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          )}

          {/* Type Segmented Pill */}
          <div className="inline-flex h-9 items-center rounded-lg bg-muted p-1 text-muted-foreground border border-border/60">
            <button
              type="button"
              onClick={() => setTypeFilter("all")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                typeFilter === "all"
                  ? "bg-card text-foreground shadow-2xs font-semibold"
                  : "hover:text-foreground"
              }`}
            >
              All Types
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("weekly")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                typeFilter === "weekly"
                  ? "bg-card text-foreground shadow-2xs font-semibold"
                  : "hover:text-foreground"
              }`}
            >
              Weekly
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("monthly")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                typeFilter === "monthly"
                  ? "bg-card text-foreground shadow-2xs font-semibold"
                  : "hover:text-foreground"
              }`}
            >
              Monthly
            </button>
          </div>

          {/* Status Segmented Pill */}
          <div className="inline-flex h-9 items-center rounded-lg bg-muted p-1 text-muted-foreground border border-border/60">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                statusFilter === "all"
                  ? "bg-card text-foreground shadow-2xs font-semibold"
                  : "hover:text-foreground"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("submitted")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                statusFilter === "submitted"
                  ? "bg-card text-foreground shadow-2xs font-semibold"
                  : "hover:text-foreground"
              }`}
            >
              Submitted
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("reviewed")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                statusFilter === "reviewed"
                  ? "bg-card text-foreground shadow-2xs font-semibold"
                  : "hover:text-foreground"
              }`}
            >
              Reviewed
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("draft")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                statusFilter === "draft"
                  ? "bg-card text-foreground shadow-2xs font-semibold"
                  : "hover:text-foreground"
              }`}
            >
              Drafts
            </button>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card py-14 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <IconFileText size={22} />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-foreground">
            No report records found
          </h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            {search || typeFilter !== "all" || statusFilter !== "all"
              ? "Try adjusting search terms or clearing active filters."
              : "Create a new weekly or monthly performance report to get started."}
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Link
              href="/reports/new/weekly"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 shadow-2xs transition-all"
            >
              <IconPlus size={13} />
              New Weekly
            </Link>
            <Link
              href="/reports/new/monthly"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted shadow-2xs transition-colors"
            >
              <IconPlus size={13} />
              New Monthly
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs tabular-nums">
              <thead className="sticky top-0 z-10 border-b border-border bg-muted/70 backdrop-blur-xs font-medium text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Report Details</th>
                  {showAuthor && <th className="px-4 py-3 font-semibold">Author &amp; Dept</th>}
                  <th className="px-4 py-3 font-semibold">Period Window</th>
                  <th className="px-4 py-3 font-semibold">Review Status</th>
                  <th className="px-4 py-3 font-semibold">Last Updated</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((r) => {
                  const author = r.author_name || r.profiles?.full_name || "Staff Member";
                  const dept = r.author_department || r.profiles?.department || "Operations";
                  const hasNotes = !!r.review_notes;

                  return (
                    <tr
                      key={r.id}
                      className="group transition-colors duration-150 hover:bg-muted/40"
                    >
                      <td className="px-4 py-3.5 font-semibold text-foreground">
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-2xs border ${
                              r.report_type === "weekly"
                                ? "bg-accent/10 text-accent border-accent/20"
                                : "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20"
                            }`}
                          >
                            <IconFileText size={15} />
                          </span>
                          <div>
                            <Link
                              href={`/reports/${r.id}`}
                              className="capitalize hover:text-accent font-semibold text-foreground transition-colors"
                            >
                              {r.report_type} Performance Report
                            </Link>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-[10px] text-muted-foreground">
                                YH-{r.id.slice(0, 8).toUpperCase()}
                              </span>
                              {hasNotes && (
                                <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-300 border border-blue-500/20">
                                  <IconMessageSquare size={10} />
                                  Guidance Attached
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {showAuthor && (
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted border border-border text-[10px] font-bold text-foreground">
                              {author
                                .split(" ")
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join("")}
                            </div>
                            <div>
                              <p className="font-medium text-foreground leading-tight">
                                {author}
                              </p>
                              <p className="text-[10px] text-muted-foreground">{dept}</p>
                            </div>
                          </div>
                        </td>
                      )}

                      <td className="px-4 py-3.5 text-foreground font-medium">
                        <div className="inline-flex items-center gap-1.5 rounded-md bg-muted/60 px-2.5 py-1 border border-border/80 text-xs">
                          <IconCalendar size={12} className="text-muted-foreground" />
                          <span>
                            {r.period_start} &rarr; {r.period_end}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <StatusBadge status={r.status} />
                      </td>

                      <td className="px-4 py-3.5 text-muted-foreground" suppressHydrationWarning>
                        {formatDate(r.updated_at || r.created_at)}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/reports/${r.id}`}
                            title="View Report"
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground shadow-2xs"
                          >
                            <IconEye size={13} />
                          </Link>

                          <Link
                            href={`/reports/${r.id}/edit`}
                            title="Edit Report"
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground shadow-2xs"
                          >
                            <IconEdit size={13} />
                          </Link>

                          <a
                            href={`/api/reports/${r.id}/export/docx`}
                            title="Download Word (.docx)"
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground shadow-2xs"
                          >
                            <IconDownload size={13} />
                          </a>

                          <button
                            type="button"
                            onClick={() => handleDelete(r.id)}
                            disabled={deletingId === r.id}
                            title="Delete Report"
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-rose-500/20 bg-card text-rose-600 dark:text-rose-400 transition-colors hover:bg-rose-500/10 shadow-2xs disabled:opacity-50"
                          >
                            <IconTrash size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-border bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
            <span>
              Showing {filtered.length} of {reports.length} report
              {reports.length === 1 ? "" : "s"}
            </span>
            <span className="font-mono text-[10px]">YETAF HOLDING GOVERNANCE</span>
          </div>
        </div>
      )}
    </div>
  );
}
