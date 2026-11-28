"use client";

import React from "react";
import { Button } from "./Button";

export function Table({
  className = "",
  children,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="relative w-full overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
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
      className={`border-b border-border [& tr]:bg-muted/50 [& tr]:sticky [& tr]:top-0 [& tr]:z-10 ${className}`}
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
        hoverable ? "hover:bg-muted/40" : ""
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
      scope="col"
      className={`h-11 px-4 text-left align-middle font-semibold text-xs uppercase tracking-wider text-muted-foreground [&:has([role=checkbox])]:pr-0 ${className}`}
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
      className={`inline-flex items-center gap-1.5 font-semibold text-xs tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 hover:text-foreground cursor-pointer ${
        isSorted ? "text-foreground" : "text-muted-foreground"
      } ${className}`}
      aria-label={isSorted ? `${label} sorted, press to toggle` : `Sort by ${label}`}
    >
      <span>{label}</span>
      <span className="flex flex-col text-[10px] leading-[8px] opacity-70">
        <span className={isSorted && currentOrder === "asc" ? "text-primary font-bold" : ""}>
          ▲
        </span>
        <span className={isSorted && currentOrder === "desc" ? "text-primary font-bold" : ""}>
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
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border bg-card p-4 text-xs text-muted-foreground ${className}`}
    >
      <div>
        {typeof totalItems === "number" ? (
          <span>
            Total{" "}
            <span className="font-semibold text-foreground tabular-nums">{totalItems}</span>{" "}
            entries · Page{" "}
            <span className="font-semibold text-foreground">{currentPage}</span> of{" "}
            <span className="font-semibold text-foreground">{totalPages}</span>
          </span>
        ) : (
          <span>
            Page <span className="font-semibold text-foreground">{currentPage}</span> of{" "}
            <span className="font-semibold text-foreground">{totalPages}</span>
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="xs"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Previous page"
        >
          Previous
        </Button>

        <div className="flex items-center gap-1 px-1">
          {Array.from({ length: totalPages }).map((_, i) => {
            const pageNum = i + 1;
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
                className={`h-7 w-7 rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer ${
                  isCurrent
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                aria-current={isCurrent ? "page" : undefined}
                aria-label={`Page ${pageNum}`}
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
          aria-label="Next page"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
