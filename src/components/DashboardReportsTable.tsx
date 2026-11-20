"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TablePagination,
  TableSortHeader,
  StatusBadge,
  Button,
  EmptyState,
  Input,
  Select,
} from "@/components/ui";
import {
  IconCalendar,
  IconDownload,
  IconEdit,
  IconEye,
  IconFileText,
  IconMessageSquare,
  IconSearch,
  IconTrash,
} from "@/components/Icons";
import type { ReportRow } from "@/types/report";
import { formatDate } from "@/lib/dateUtils";
import { HoldingDepartmentScorecard } from "@/components/HoldingDepartmentScorecard";

type SortField = "type" | "author" | "period" | "status" | "date";

export function DashboardReportsTable({
  initialReports,
  showAuthor = false,
  windowLocked = false,
}: {
  initialReports: ReportRow[];
  showAuthor?: boolean;
  isPrivileged?: boolean;
  windowLocked?: boolean;
}) {
  const router = useRouter();
  const [reports, setReports] = useState<ReportRow[]>(initialReports);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Pagination & Sorting state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [sortField, setSortField] = useState<SortField | null>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Extract unique departments for filter dropdown
  const departments = useMemo(() => {
    return Array.from(
      new Set(
        reports
          .map((r) => r.author_department || r.profiles?.department)
          .filter(Boolean) as string[]
      )
    );
  }, [reports]);

  // Handle Sort Toggle
  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  }

  // Filtered & Sorted Reports
  const processedReports = useMemo(() => {
    const filtered = reports.filter((r) => {
      const matchesType = typeFilter === "all" || r.report_type === typeFilter;
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      const dept = r.author_department || r.profiles?.department || "";
      const matchesDept = departmentFilter === "all" || dept === departmentFilter;
      const author = r.author_name || r.profiles?.full_name || "";
      const matchesSearch =
        !search ||
        r.period_start.includes(search) ||
        r.period_end.includes(search) ||
        r.report_type.toLowerCase().includes(search.toLowerCase()) ||
        author.toLowerCase().includes(search.toLowerCase()) ||
        dept.toLowerCase().includes(search.toLowerCase());

      return matchesType && matchesStatus && matchesDept && matchesSearch;
    });

    if (!sortField) return filtered;

    return [...filtered].sort((a, b) => {
      let comp = 0;
      switch (sortField) {
        case "type":
          comp = a.report_type.localeCompare(b.report_type);
          break;
        case "author": {
          const aAuth = a.author_name || a.profiles?.full_name || "";
          const bAuth = b.author_name || b.profiles?.full_name || "";
          comp = aAuth.localeCompare(bAuth);
          break;
        }
        case "period":
          comp = a.period_start.localeCompare(b.period_start);
          break;
        case "status":
          comp = a.status.localeCompare(b.status);
          break;
        case "date": {
          const aDate = new Date(a.updated_at || a.created_at).getTime();
          const bDate = new Date(b.updated_at || b.created_at).getTime();
          comp = aDate - bDate;
          break;
        }
      }
      return sortOrder === "asc" ? comp : -comp;
    });
  }, [reports, search, typeFilter, statusFilter, departmentFilter, sortField, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(processedReports.length / pageSize));
  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedReports.slice(start, start + pageSize);
  }, [processedReports, currentPage, pageSize]);

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
      {/* Subsidiary Performance Scorecard */}
      {showAuthor && (
        <HoldingDepartmentScorecard
          reports={reports}
          selectedDepartment={departmentFilter}
          onSelectDepartment={(dept) => {
            setDepartmentFilter(dept);
            setCurrentPage(1);
          }}
        />
      )}

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-md w-full">
          <Input
            type="text"
            placeholder="Filter by keyword, period, or author..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            leftIcon={<IconSearch size={14} />}
            rightIcon={
              search ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="text-muted-foreground hover:text-foreground text-xs cursor-pointer"
                >
                  &times;
                </button>
              ) : undefined
            }
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Department Filter (for Direction / Admin) */}
          {showAuthor && departments.length > 0 && (
            <div className="w-48">
              <Select
                value={departmentFilter}
                onChange={(e) => {
                  setDepartmentFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {/* Type Segmented Control */}
          <div className="inline-flex h-9 items-center rounded-lg bg-muted/60 p-1 text-muted-foreground border border-border">
            {(["all", "weekly", "monthly"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTypeFilter(t);
                  setCurrentPage(1);
                }}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-150 cursor-pointer ${
                  typeFilter === t
                    ? "bg-card text-foreground shadow-2xs font-semibold"
                    : "hover:text-foreground"
                }`}
              >
                {t === "all" ? "All Types" : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Status Segmented Control */}
          <div className="inline-flex h-9 items-center rounded-lg bg-muted/60 p-1 text-muted-foreground border border-border">
            {(["all", "submitted", "reviewed", "draft"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setStatusFilter(s);
                  setCurrentPage(1);
                }}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-150 cursor-pointer ${
                  statusFilter === s
                    ? "bg-card text-foreground shadow-2xs font-semibold"
                    : "hover:text-foreground"
                }`}
              >
                {s === "all"
                  ? "All"
                  : s === "draft"
                  ? "Drafts"
                  : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Reports Table or Empty State */}
      {processedReports.length === 0 ? (
        <EmptyState
          title="No report records found"
          description={
            search || typeFilter !== "all" || statusFilter !== "all"
              ? "Try adjusting search terms or clearing active filters."
              : "Create a new weekly or monthly performance report to get started."
          }
          actionLabel="New Weekly Report"
          onAction={() => router.push("/reports/new/weekly")}
          secondaryActionLabel="New Monthly Report"
          onSecondaryAction={() => router.push("/reports/new/monthly")}
        />
      ) : (
        <div className="space-y-0">
          <Table>
            <TableHeader>
              <tr>
                <TableHead>
                  <TableSortHeader
                    columnKey="type"
                    label="Report Details"
                    currentSort={sortField}
                    currentOrder={sortOrder}
                    onSort={handleSort}
                  />
                </TableHead>
                {showAuthor && (
                  <TableHead>
                    <TableSortHeader
                      columnKey="author"
                      label="Author & Dept"
                      currentSort={sortField}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                    />
                  </TableHead>
                )}
                <TableHead>
                  <TableSortHeader
                    columnKey="period"
                    label="Period Window"
                    currentSort={sortField}
                    currentOrder={sortOrder}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead>
                  <TableSortHeader
                    columnKey="status"
                    label="Review Status"
                    currentSort={sortField}
                    currentOrder={sortOrder}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead>
                  <TableSortHeader
                    columnKey="date"
                    label="Last Updated"
                    currentSort={sortField}
                    currentOrder={sortOrder}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {paginatedReports.map((r) => {
                const author = r.author_name || r.profiles?.full_name || "Staff Member";
                const dept = r.author_department || r.profiles?.department || "Operations";
                const hasNotes = !!r.review_notes;

                return (
                  <TableRow key={r.id}>
                    {/* Report Type & Ref */}
                    <TableCell className="font-semibold text-foreground">
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
                    </TableCell>

                    {/* Author & Dept */}
                    {showAuthor && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted border border-border text-[10px] font-bold text-foreground">
                            {author
                              .split(" ")
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join("")}
                          </div>
                          <div>
                            <p className="font-medium text-foreground leading-tight text-xs">
                              {author}
                            </p>
                            <p className="text-[10px] text-muted-foreground">{dept}</p>
                          </div>
                        </div>
                      </TableCell>
                    )}

                    {/* Period Window */}
                    <TableCell className="text-foreground font-medium">
                      <div className="inline-flex items-center gap-1.5 rounded-md bg-muted/60 px-2.5 py-1 border border-border/80 text-xs">
                        <IconCalendar size={12} className="text-muted-foreground" />
                        <span>
                          {r.period_start} &rarr; {r.period_end}
                        </span>
                      </div>
                    </TableCell>

                    {/* Status Badge */}
                    <TableCell>
                      <StatusBadge status={r.status} size="sm" />
                    </TableCell>

                    {/* Last Updated */}
                    <TableCell className="text-muted-foreground text-xs" suppressHydrationWarning>
                      {formatDate(r.updated_at || r.created_at)}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={`/reports/${r.id}`}>
                          <Button variant="ghost" size="xs" leftIcon={<IconEye size={12} />}>
                            View
                          </Button>
                        </Link>

                        {r.status === "draft" && !windowLocked && (
                          <Link href={`/reports/${r.id}/edit`}>
                            <Button variant="outline" size="xs" leftIcon={<IconEdit size={12} />}>
                              Edit
                            </Button>
                          </Link>
                        )}

                        <a href={`/api/reports/${r.id}/export/docx`} download>
                          <Button variant="outline" size="xs" leftIcon={<IconDownload size={12} />}>
                            Word
                          </Button>
                        </a>

                        {r.status === "draft" && (
                          <Button
                            variant="destructive"
                            size="xs"
                            loading={deletingId === r.id}
                            onClick={() => handleDelete(r.id)}
                            leftIcon={<IconTrash size={12} />}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={processedReports.length}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>
      )}
    </div>
  );
}
