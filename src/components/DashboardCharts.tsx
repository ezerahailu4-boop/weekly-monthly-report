"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ReportRow } from "@/types/report";
import { Badge } from "@/components/ui";
import {
  IconBarChart,
  IconBuilding,
  IconLayers,
  IconTrendingUp,
} from "@/components/Icons";

interface DashboardChartsProps {
  reports: ReportRow[];
  employees: { id: string; department: string | null }[];
  asOfDate: string;
  weekPeriod: { start: string; end: string };
  monthPeriod: { start: string; end: string };
}

const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const tooltipStyle: React.CSSProperties = {
  backgroundColor: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "10px",
  color: "var(--muted-foreground)",
  fontSize: "12px",
  padding: "10px 14px",
  boxShadow: "0 8px 24px -4px rgba(0,0,0,0.08)",
};

/* Distinct, accessible palette — indigo brand as the single accent. */
const CHART_COLORS = {
  primary: "var(--brand)",           // indigo
  primaryLight: "color-mix(in srgb, var(--brand) 35%, var(--card))",
  secondary: "var(--muted-foreground)",
  success: "var(--success-text)",
  warning: "var(--warning-text)",
  surface: "var(--border)",
};

function parseYmd(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function weekStart(date: Date): Date {
  const monday = new Date(date);
  const day = monday.getUTCDay();
  monday.setUTCDate(monday.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return monday;
}

function ymd(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function weekLabel(date: Date): string {
  return `${SHORT_MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`;
}

function hasFiledReport(
  reports: ReportRow[],
  userId: string,
  type: "weekly" | "monthly",
  period: { start: string; end: string },
): boolean {
  return reports.some((report) =>
    report.user_id === userId &&
    report.report_type === type &&
    report.status !== "draft" &&
    report.period_start <= period.end &&
    report.period_end >= period.start
  );
}

export interface StatusChartProps {
  submitted: number;
  awaitingReview: number;
  drafts: number;
}

export function StatusChart({ submitted, awaitingReview, drafts }: StatusChartProps) {
  const total = submitted + awaitingReview + drafts;
  const data = [
    { name: "Submitted", value: submitted, color: CHART_COLORS.success },
    { name: "Awaiting review", value: awaitingReview, color: CHART_COLORS.warning },
    { name: "Draft", value: drafts, color: CHART_COLORS.secondary },
  ].filter((item) => item.value > 0);

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex-1 min-h-0 flex items-center justify-center">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              cx="50%" cy="50%" innerRadius={70} outerRadius={95} paddingAngle={6} dataKey="value"
              startAngle={0} endAngle={360}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 10 }} verticalAlign="bottom" align="center" />
              {total > 0 && (
                <text
                  x="50%"
                  y="48%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="var(--foreground)"
                  fontSize="20"
                  fontWeight="700"
                >
                  {total}
                </text>
              )}
              {total > 0 && (
                <text
                  x="50%"
                  y="58%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="var(--muted-foreground)"
                  fontSize="10"
                >
                  filings
                </text>
              )}
            </Pie>
          </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex items-center justify-between gap-4 px-2">
          {data.map((entry) => {
            const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
            return (
              <div key={entry.name} className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: entry.color.replace("var(--brand)", "var(--primary)"),
                  }}
                />
                <span className="text-xs font-medium text-foreground">{entry.name}</span>
                <span className="ml-1 text-xs font-bold text-muted-foreground tabular-nums">
                  {entry.value} ({pct}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>
  );
}

export interface TrendChartProps {
  data: { month: string; count: number }[];
  label: string;
}

export function TrendChart({ data, label }: TrendChartProps) {
  const [range, setRange] = useState<"7d" | "30d" | "12m">("30d");

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <Badge variant="outline" size="sm">{label}</Badge>
        <div className="flex items-center gap-1">
          {[
            { value: "7d" as const, label: "7 days" },
            { value: "30d" as const, label: "30 days" },
            { value: "12m" as const, label: "12 months" },
          ].map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRange(r.value)}
              aria-pressed={range === r.value}
              aria-label={`Range ${r.label} ${range === r.value ? "selected" : ""}`}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
                range === r.value
                  ? "bg-brand text-brand-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 8, right: 20, bottom: 8, left: 0 }}>
          <defs>
            <linearGradient id="filing-trend-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.3" />
              <stop offset="95%" stopColor="var(--brand)" stopOpacity="0.015" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 5" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip contentStyle={tooltipStyle} />
          <Area
            type="monotone"
            dataKey="count"
            name={label}
            stroke="var(--brand)"
            strokeWidth={2.5}
            activeDot={{ r: 5, stroke: "var(--brand)", strokeWidth: 0 }}
            dot={{ fill: "var(--brand)", stroke: "var(--card)", strokeWidth: 2 }}
            fill="url(#filing-trend-fill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ComplianceChart({
  departmentData,
  employees,
}: {
  departmentData: { department: string; label: string; rate: number; expected: number; filed: number }[];
  employees: { id: string; department: string | null }[];
}) {
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand ring-1 ring-brand-100">
            <IconBuilding size={14} />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-foreground tracking-tight">
              Current-period submission coverage
            </h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Filed reports divided by expected weekly and monthly reports per employee
            </p>
          </div>
        </div>
        <Badge variant="outline" size="sm">{employees.length} employees</Badge>
      </div>
      {departmentData.length ? (
        <ResponsiveContainer
          width="100%"
          height={Math.max(260, Math.min(departmentData.length, 8) * 44)}
        >
          <BarChart
            data={departmentData.slice(0, 8)}
            layout="vertical"
            margin={{ top: 4, right: 20, bottom: 4, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 5" stroke="var(--border)" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{
                fontSize: 10,
                fill: "var(--muted-foreground)",
              }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ fontSize: 11, fill: "var(--foreground)" }}
              axisLine={false}
              tickLine={false}
              width={128}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value: any) => {
                const v = typeof value === "number" ? value : 0;
                const item = departmentData.find((d) => d.rate === Math.round(v));
                const filed = item?.filed ?? 0;
                const expected = item?.expected ?? 0;
                return `${v}% (${filed}/${expected} reports)`;
              }}
            />
            <Bar dataKey="rate" name="Coverage" fill="var(--brand)" radius={[0, 6, 6, 0]} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <EmptyChart>
          {employees.length ? "No department data available" : "Department coverage is available to management only"}
        </EmptyChart>
      )}
      {departmentData.length > 8 && (
        <p className="mt-1 text-center text-[10px] text-muted-foreground">
          Showing 8 of {departmentData.length} departments, sorted by coverage.
        </p>
      )}
    </div>
  );
}

function EmptyChart({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[220px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-4 text-center text-xs text-muted-foreground">
      {children}
    </div>
  );
}
