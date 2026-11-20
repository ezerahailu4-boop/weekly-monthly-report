"use client";

import React from "react";
import { Button } from "./Button";

export function Table({
  className = "",
  children,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="relative w-full overflow-x-auto rounded-xl border border-border bg-card">
      <table className={`w-full caption-bottom text-sm ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={`border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider ${className}`}
      {...props}
    >
      {children}
    </thead>
  );
}

export function TableBody({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={`divide-y divide-border/60 ${className}`} {...props}>
      {children}
    </tbody>
  );
}

export function TableFooter({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tfoot
      className={`border-t border-border bg-muted/40 font-medium ${className}`}
      {...props}
    >
      {children}
    </tfoot>
  );
}

export function TableRow({
  className = "",
  hoverable = true,
  children,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement> & { hoverable?: boolean }) {
  return (
    <tr
      className={`transition-colors duration-150 ${
        hoverable ? "hover:bg-muted/30" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHead({
  className = "",
  children,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={`h-10 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 ${className}`}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableCell({
  className = "",
  children,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={`p-4 align-middle [&:has([role=checkbox])]:pr-0 text-foreground ${className}`}
      {...props}
    >
      {children}
    </td>
  );
}

export function TableSortHeader<T extends string = string>({
  columnKey,
  label,
  currentSort,
  currentOrder,
  onSort,
  className = "",
}: {
  columnKey: T;
  label: string;
  currentSort: T | null;
  currentOrder: "asc" | "desc";
  onSort: (key: T) => void;
  className?: string;
}) {
  const isSorted = currentSort === columnKey;

  return (
    <button
      type="button"
      onClick={() => onSort(columnKey)}
      className={`inline-flex items-center gap-1.5 font-semibold text-xs tracking-wider transition-colors hover:text-foreground cursor-pointer ${
        isSorted ? "text-foreground" : "text-muted-foreground"
      } ${className}`}
    >
      <span>{label}</span>
      <span className="flex flex-col text-[10px] leading-[8px] opacity-70">
        <span className={isSorted && currentOrder === "asc" ? "text-accent font-bold" : ""}>
          ▲
        </span>
        <span className={isSorted && currentOrder === "desc" ? "text-accent font-bold" : ""}>
          ▼
        </span>
      </span>
    </button>
  );
}

export function TablePagination({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
  className = "",
}: {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  if (totalPages <= 1) return null;

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border bg-card text-xs text-muted-foreground ${className}`}
    >
      <div>
        {typeof totalItems === "number" ? (
          <span>
            Total <strong className="text-foreground">{totalItems}</strong> entries · Page{" "}
            <strong className="text-foreground">{currentPage}</strong> of{" "}
            <strong className="text-foreground">{totalPages}</strong>
          </span>
        ) : (
          <span>
            Page <strong className="text-foreground">{currentPage}</strong> of{" "}
            <strong className="text-foreground">{totalPages}</strong>
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="xs"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Previous
        </Button>

        <div className="flex items-center gap-1 px-1">
          {Array.from({ length: totalPages }).map((_, i) => {
            const pageNum = i + 1;
            // Only show nearby pages if totalPages is large
            if (
              totalPages > 7 &&
              Math.abs(pageNum - currentPage) > 2 &&
              pageNum !== 1 &&
              pageNum !== totalPages
            ) {
              if (Math.abs(pageNum - currentPage) === 3) {
                return (
                  <span key={pageNum} className="px-1 text-muted-foreground">
                    …
                  </span>
                );
              }
              return null;
            }

            const isCurrent = pageNum === currentPage;
            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => onPageChange(pageNum)}
                className={`h-7 w-7 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  isCurrent
                    ? "bg-accent text-accent-foreground font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="xs"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

