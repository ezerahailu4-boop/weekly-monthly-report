import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { ReportType } from "@/types/report";

export interface WarningLetterInput {
  letterRef: string;
  issuedDateLabel: string;
  employeeName: string;
  employeeEmail: string;
  department: string;
  reportType: ReportType;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  strikeNumber: number;
  priorWarningDateLabel?: string | null;
  priorWarningPeriodLabel?: string | null;
  issuedByName?: string | null;
}

function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  if (n % 10 === 1) return `${n}st`;
  if (n % 10 === 2) return `${n}nd`;
  if (n % 10 === 3) return `${n}rd`;
  return `${n}th`;
}

/** Compose structured formal written warning letter text stored in DB & shown in UI/DOCX. */
export function composeWarningLetterContent(input: WarningLetterInput): {
  subject: string;
  paragraphs: string[];
  body: string;
} {
  const reportTitle =
    input.reportType === "monthly"
      ? "Monthly Progress Report"
      : "Weekly Performance Report";
  const dept = input.department || "Operations";
  const subject = `Formal Written Warning (${ordinal(input.strikeNumber)} Offense) — Non-Submission of ${reportTitle} (${input.periodLabel})`;

  const priorNote = input.priorWarningDateLabel
    ? `Following our prior Verbal Warning issued on ${input.priorWarningDateLabel}${
        input.priorWarningPeriodLabel ? ` (${input.priorWarningPeriodLabel})` : ""
      }, company records show that you have failed (${ordinal(input.strikeNumber)} offense) to submit a mandatory performance report within the official Ethiopian Time reporting window.`
    : `Following your prior Verbal Warning on record, company records show a repeated failure (${ordinal(input.strikeNumber)} offense) to submit a mandatory performance report within the official Ethiopian Time reporting window.`;

  const paragraphs = [
    `Dear ${input.employeeName},`,
    `${priorNote}`,
    `Specifically, your required ${reportTitle} covering ${input.periodLabel} (${input.periodStart} to ${input.periodEnd}) was not submitted before the deadline.`,
    `Timely weekly and monthly reporting is a core governance requirement at YETAF HOLDING LIMITED (${dept} Division) to maintain operational visibility and executive accountability.`,
    `Please treat this document (Reference: ${input.letterRef}) as an official Formal Written Warning placed on your personnel compliance record. You are instructed to log in to the YETAF HOLDING Executive Reporting Portal immediately to complete any overdue or upcoming submissions within the scheduled reporting window.`,
    `Please note that any further missed reporting deadlines after this Written Warning Letter may result in escalated administrative or disciplinary action in accordance with company HR policy.`,
    `If you believe this notice was issued due to an approved leave or exceptional technical issue, please contact Administration immediately so your record can be reviewed.`,
  ];

  return {
    subject,
    paragraphs,
    body: paragraphs.join("\n\n"),
  };
}

function infoRow(label: string, value: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 32, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.CLEAR, fill: "F5F5F4" },
        children: [
          new Paragraph({
            spacing: { before: 60, after: 60 },
            children: [
              new TextRun({ text: label, bold: true, size: 20, color: "292524" }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 68, type: WidthType.PERCENTAGE },
        children: [
          new Paragraph({
            spacing: { before: 60, after: 60 },
            children: [new TextRun({ text: value || "—", size: 20, color: "1C1917" })],
          }),
        ],
      }),
    ],
  });
}

/** Generate a formal YETAF HOLDING Written Warning Letter Word (.docx) buffer. */
export async function buildWarningLetterDocx(
  input: WarningLetterInput & { subject?: string; body?: string }
): Promise<Buffer> {
  const composed = composeWarningLetterContent(input);
  const subject = input.subject || composed.subject;
  const paragraphs = input.body
    ? input.body
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean)
    : composed.paragraphs;

  const reportTitle =
    input.reportType === "monthly"
      ? "Monthly Progress Report"
      : "Weekly Performance Report";

  const doc = new Document({
    sections: [
      {
        children: [
          // Corporate Header
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: "YETAF HOLDING LIMITED",
                bold: true,
                size: 32,
                color: "18181B",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 12, color: "B48628" },
            },
            children: [
              new TextRun({
                text: "OFFICE OF EXECUTIVE ADMINISTRATION & HUMAN RESOURCES · ADDIS ABABA, ETHIOPIA",
                bold: true,
                size: 18,
                color: "78716C",
              }),
            ],
          }),

          // Classification Badge Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 240, after: 220 },
            children: [
              new TextRun({
                text: "OFFICIAL WRITTEN WARNING LETTER",
                bold: true,
                size: 26,
                color: "991B1B",
              }),
            ],
          }),

          // Metadata Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              infoRow("Letter Reference", input.letterRef),
              infoRow("Date Issued", input.issuedDateLabel),
              infoRow("Employee Name", input.employeeName),
              infoRow("Department / Division", input.department || "Operations"),
              infoRow("Corporate Email", input.employeeEmail),
              infoRow("Missed Submission", reportTitle),
              infoRow(
                "Reporting Period",
                `${input.periodLabel} (${input.periodStart} to ${input.periodEnd})`
              ),
              infoRow(
                "Disciplinary Level",
                `Strike #${input.strikeNumber} — Formal Written Warning (Auto-Escalated)`
              ),
              ...(input.priorWarningDateLabel
                ? [
                    infoRow(
                      "Prior 1st Warning",
                      `Verbal Warning on ${input.priorWarningDateLabel}${
                        input.priorWarningPeriodLabel
                          ? ` (${input.priorWarningPeriodLabel})`
                          : ""
                      }`
                    ),
                  ]
                : []),
            ],
          }),

          // Subject Line
          new Paragraph({
            spacing: { before: 280, after: 180 },
            children: [
              new TextRun({ text: "SUBJECT: ", bold: true, size: 22, color: "18181B" }),
              new TextRun({
                text: subject,
                bold: true,
                underline: {},
                size: 22,
                color: "18181B",
              }),
            ],
          }),

          // Body Paragraphs
          ...paragraphs.map(
            (p) =>
              new Paragraph({
                spacing: { after: 160 },
                children: [new TextRun({ text: p, size: 22, color: "27272A" })],
              })
          ),

          // Sign-off Block
          new Paragraph({
            spacing: { before: 320, after: 80 },
            children: [new TextRun({ text: "Sincerely,", size: 22, color: "18181B" })],
          }),
          new Paragraph({
            spacing: { before: 140, after: 40 },
            children: [
              new TextRun({
                text: input.issuedByName || "Executive Administration & HR Compliance",
                bold: true,
                size: 22,
                color: "18181B",
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 40 },
            children: [
              new TextRun({
                text: "YETAF HOLDING LIMITED",
                bold: true,
                size: 20,
                color: "B48628",
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 240 },
            children: [
              new TextRun({
                text: "CC: Office of the Chief Executive Officer · Personnel Compliance Record",
                italics: true,
                size: 18,
                color: "71717A",
              }),
            ],
          }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
