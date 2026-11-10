import { NextResponse } from "next/server";
import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  TextRun,
  AlignmentType,
} from "docx";
import { getReportForExport } from "@/lib/getReportForExport";
import type { WeeklyReportData, MonthlyReportData, ReportRow } from "@/types/report";

function heading(text: string) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 120 } });
}

function subheading(text: string) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true })],
    spacing: { before: 160, after: 60 },
  });
}

function body(text: string) {
  return new Paragraph({ text: text || "—", spacing: { after: 100 } });
}

function cell(text: string, opts: { header?: boolean } = {}) {
  return new TableCell({
    width: { size: 100, type: WidthType.PERCENTAGE },
    children: [
      new Paragraph({
        children: [new TextRun({ text: text || "", bold: !!opts.header })],
      }),
    ],
  });
}

function table(headerCells: string[], rows: string[][]) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: headerCells.map((h) => cell(h, { header: true })) }),
      ...rows.map((r) => new TableRow({ children: r.map((c) => cell(c)) })),
    ],
  });
}

function buildWeeklyDoc(report: ReportRow) {
  const d = report.data as WeeklyReportData;
  const elements: (Paragraph | Table)[] = [
    new Paragraph({
      text: "Weekly Performance Report",
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      text: `${report.period_start} to ${report.period_end} · Yetaf Holding Limited`,
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    }),

    heading("1. Reporting Information"),
    body(`Reporting week: From ${d.reportingWeekFrom || report.period_start} to ${d.reportingWeekTo || report.period_end}`),
    body(`Prepared by: ${d.preparedBy || report.author_name || "Staff Member"}`),

    heading("2. Executive Summary (complete in 3–5 short)"),
    body(d.executiveSummary),

    heading("3. Weekly KPI and Activity Performance"),
    table(
      ["No.", "KPI / planned activity", "Weekly target", "Performance", "% Achievement", "Remark"],
      d.kpiRows.map((r, i) => [String(i + 1), r.kpi, r.target, r.performance, r.percentAchievement, r.remark])
    ),

    heading("4. Activities Planned but Not Completed if any"),
    table(
      ["No.", "Planned activity", "Reason not completed"],
      d.incompleteRows.map((r, i) => [String(i + 1), r.activity, r.reason])
    ),

    heading("5. Challenges and Actions taken to mitigate the challenges"),
    body(d.challenges),

    heading("6. Priorities for the Coming Week"),
    body(d.prioritiesNextWeek),

    heading("7. Support or Decisions Required from the Holding"),
    body(d.supportRequired),
  ];

  if (report.status === "reviewed" || report.review_notes) {
    elements.push(
      heading("8. Executive Management & Board Review"),
      body(`Review Status: ${report.status === "reviewed" ? "Approved & Reviewed" : "Under Review"}`),
      body(`Reviewing Executive: ${report.reviewer_name || "Office of the CEO & Executive Management"}`),
      body(`Review Date: ${report.reviewed_at ? report.reviewed_at.slice(0, 10) : "Recorded in Portal"}`),
      subheading("Executive Leadership Guidance & Directives:"),
      body(report.review_notes || "Report accepted and signed off with no exceptions.")
    );
  }

  return elements;
}

function buildMonthlyDoc(report: ReportRow) {
  const d = report.data as MonthlyReportData;
  const elements: (Paragraph | Table)[] = [
    new Paragraph({
      text: "YETAF HOLDING Month progress report",
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      text: `${report.period_start} to ${report.period_end} · Yetaf Holding Limited`,
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    }),

    heading("1. Status of Management Directions Given in the last reporting section"),
    body(d.statusOfDirections),

    heading("2. Executive summary"),
    body(d.executiveSummary),

    heading("3. Goals and planned activities Performance"),
    table(
      ["S/N", "Planned activities", "/KPI /", "Target", "Actual Performance", "Percentage", "Remarks"],
      d.goalRows.map((r, i) => [
        String(i + 1),
        r.plannedActivity,
        r.kpi,
        r.target,
        r.actualPerformance,
        r.percentage,
        r.remarks,
      ])
    ),

    heading("4. Additional Activities Completed and Planned Activities Not Executed"),
    subheading("Additional Activities performed"),
    body(d.additionalActivitiesPerformed),
    subheading("Activities planned but not executed"),
    body(d.activitiesPlannedNotExecuted),

    heading("5. Challenges And Action Taken to Overcome the Challenge"),
    subheading("Challenge encountered."),
    body(d.challengeEncountered),
    subheading("Action taken to solve / Address/ the challenge"),
    body(d.actionTaken),

    heading("6. Follow-up, Support, and Evaluation Activities Conducted"),
    subheading("Support and Follow-up Activities Conducted During the Period"),
    body(d.supportAndFollowUp),

    heading("7. Performance Focus Areas for Next Month"),
    body(d.focusAreasNextMonth),
  ];

  if (report.status === "reviewed" || report.review_notes) {
    elements.push(
      heading("8. Executive Management & Board Review"),
      body(`Review Status: ${report.status === "reviewed" ? "Approved & Reviewed" : "Under Review"}`),
      body(`Reviewing Executive: ${report.reviewer_name || "Office of the CEO & Executive Management"}`),
      body(`Review Date: ${report.reviewed_at ? report.reviewed_at.slice(0, 10) : "Recorded in Portal"}`),
      subheading("Executive Leadership Guidance & Directives:"),
      body(report.review_notes || "Report accepted and signed off with no exceptions.")
    );
  }

  return elements;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const report = await getReportForExport(id);
  if (!report) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const children =
    report.report_type === "weekly"
      ? buildWeeklyDoc(report)
      : buildMonthlyDoc(report);

  const doc = new Document({ sections: [{ children }] });
  const buffer = await Packer.toBuffer(doc);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${report.report_type}-report-${report.period_start}.docx"`,
    },
  });
}
