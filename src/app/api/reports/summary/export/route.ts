import { NextResponse } from "next/server";
import { chromium } from "playwright";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { ETHIOPIA_TIMEZONE } from "@/lib/windowSchedule";
import {
  generateExecutiveSummary,
  type SummaryStaffMember,
} from "@/lib/executiveSummary";
import {
  buildExecutiveSummaryDocx,
  renderExecutiveSummaryHtml,
} from "@/lib/executiveSummaryExport";
import type { ReportRow } from "@/types/report";

interface DbReportExportRow {
  id: string;
  company_id: string | null;
  company_name: string | null;
  user_id: string;
  report_type: ReportRow["report_type"];
  period_start: string;
  period_end: string;
  status: ReportRow["status"];
  data: ReportRow["data"];
  review_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
  author_name: string | null;
  author_department: string | null;
  author_email: string | null;
  reviewer_name: string | null;
}

interface DbStaffRow {
  id: string;
  full_name: string;
  email: string;
  department: string;
  role: string;
}

function sanitizeFileSlug(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "admin" && user.role !== "super_admin") {
    return NextResponse.json(
      { error: "Forbidden: Executive or Admin privileges required." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") === "pdf" ? "pdf" : "docx";
  const rawType = searchParams.get("type");
  const reportType: "weekly" | "monthly" | "all" =
    rawType === "weekly" || rawType === "monthly" ? rawType : "all";

  const startParam = searchParams.get("start");
  const endParam = searchParams.get("end");
  const periodStart =
    startParam && /^\d{4}-\d{2}-\d{2}$/.test(startParam) ? startParam : null;
  const periodEnd =
    endParam && /^\d{4}-\d{2}-\d{2}$/.test(endParam) ? endParam : null;
  const periodLabel =
    searchParams.get("label")?.trim() ||
    (periodStart && periodEnd ? `${periodStart} to ${periodEnd}` : "All Reporting Periods");
  const departmentFilter = searchParams.get("department")?.trim() || "all";
  const includeDrafts = searchParams.get("includeDrafts") === "true";

  const [rawReports, rawStaff] = await Promise.all([
    sql`
      SELECT r.id, r.user_id, r.company_id, c.name as company_name, r.report_type,
             to_char(r.period_start, 'YYYY-MM-DD') as period_start,
             to_char(r.period_end, 'YYYY-MM-DD') as period_end,
             r.status, r.data, r.review_notes, r.reviewed_by, r.reviewed_at,
             r.created_at, r.updated_at,
             u.full_name as author_name, u.department as author_department, u.email as author_email,
             rev.full_name as reviewer_name
      FROM reports r
      LEFT JOIN companies c ON r.company_id = c.id
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN users rev ON r.reviewed_by = rev.id
      ORDER BY r.created_at DESC;
    `,
    sql`
      SELECT id, full_name, email, department, role
      FROM users
      ORDER BY full_name ASC;
    `,
  ]);

  const reports: ReportRow[] = (rawReports as DbReportExportRow[]).map((r) => ({
    id: r.id,
    user_id: r.user_id,
    company_id: r.company_id,
    company_name: r.company_name,
    report_type: r.report_type,
    period_start: r.period_start,
    period_end: r.period_end,
    status: r.status,
    data: r.data,
    created_at:
      typeof r.created_at === "string" ? r.created_at : r.created_at.toISOString(),
    updated_at:
      typeof r.updated_at === "string" ? r.updated_at : r.updated_at.toISOString(),
    author_name: r.author_name,
    author_department: r.author_department,
    author_email: r.author_email,
    review_notes: r.review_notes,
    reviewed_by: r.reviewed_by,
    reviewed_at: r.reviewed_at
      ? typeof r.reviewed_at === "string"
        ? r.reviewed_at
        : r.reviewed_at.toISOString()
      : null,
    reviewer_name: r.reviewer_name,
    profiles: {
      full_name: r.author_name,
      department: r.author_department,
    },
  }));

  const staff: SummaryStaffMember[] = (rawStaff as DbStaffRow[]).map((s) => ({
    id: s.id,
    full_name: s.full_name,
    email: s.email,
    department: s.department,
    role: s.role as SummaryStaffMember["role"],
  }));

  const generatedAtLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: ETHIOPIA_TIMEZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date()) + " EAT";

  const summary = generateExecutiveSummary({
    reportType,
    periodStart,
    periodEnd,
    periodLabel,
    departmentFilter,
    includeDrafts,
    reports,
    staff,
    generatedAtLabel,
  });

  const slug = sanitizeFileSlug(
    `yetaf-executive-summary-${reportType}-${periodStart || "all"}`
  );

  if (format === "docx") {
    const buffer = await buildExecutiveSummaryDocx(summary);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${slug}.docx"`,
      },
    });
  }

  const html = renderExecutiveSummaryHtml(summary);

  try {
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "load" });
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "12mm", bottom: "14mm", left: "10mm", right: "10mm" },
      });

      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${slug}.pdf"`,
        },
      });
    } finally {
      await browser.close();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("Headless Chromium launch failed for summary PDF export:", message);

    const printableHtml = html.replace(
      "</body>",
      `<script>window.onload = function() { window.print(); }</script></body>`
    );

    return new NextResponse(printableHtml, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  }
}

