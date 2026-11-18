import { NextResponse } from "next/server";
import { chromium } from "playwright";
import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getPortalSettings } from "@/lib/portalSettings";
import {
  OFFICIAL_LETTERHEAD_CSS,
  buildOfficialDocxFooterBlock,
  buildOfficialDocxLetterhead,
  renderOfficialFooterHtml,
  renderOfficialLetterheadHtml,
} from "@/lib/officialLetterhead";
import type { ActionPlanObjective } from "@/types/plan";

function esc(s: string | undefined | null) {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function cell(text: string, header = false) {
  return new TableCell({
    shading: header ? { type: ShadingType.CLEAR, fill: "F1F5F9" } : undefined,
    children: [
      new Paragraph({
        spacing: { before: 40, after: 40 },
        children: [new TextRun({ text: text || "—", bold: header, size: 20 })],
      }),
    ],
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const format = new URL(request.url).searchParams.get("format") === "pdf" ? "pdf" : "docx";

  const [settings, rows] = await Promise.all([
    getPortalSettings(),
    sql`
      SELECT p.id, p.reference_code, p.user_id, p.title, p.department,
             to_char(p.period_start, 'YYYY-MM-DD') as period_start,
             to_char(p.period_end, 'YYYY-MM-DD') as period_end,
             p.objectives, p.summary, p.status, p.review_notes,
             u.full_name as author_name, rev.full_name as reviewer_name,
             d.reference_code as directive_ref, d.title as directive_title
      FROM action_plans p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN users rev ON p.reviewed_by = rev.id
      LEFT JOIN directives d ON p.directive_id = d.id
      WHERE p.id = ${id}
      LIMIT 1;
    `,
  ]);

  if (rows.length === 0) {
    return NextResponse.json({ error: "Action plan not found" }, { status: 404 });
  }

  const p = rows[0];
  const isPrivileged = user.role === "admin" || user.role === "super_admin";
  if (!isPrivileged && p.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const objectives: ActionPlanObjective[] = Array.isArray(p.objectives) ? p.objectives : [];
  const refCode = String(p.reference_code);
  const safeSlug = refCode.toLowerCase().replace(/[^a-z0-9-]+/g, "-");

  if (format === "docx") {
    const children: (Paragraph | Table)[] = [
      ...buildOfficialDocxLetterhead({
        config: settings.letterhead_config,
        documentTitle: "Official Action Plan Submission",
        documentSubtitle: `${String(p.title)} · ${String(p.period_start)} to ${String(p.period_end)}`,
        referenceCode: refCode,
      }),
      new Paragraph({
        text: "1. Plan Information",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 80 },
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [cell("Department / Unit", true), cell(String(p.department))] }),
          new TableRow({ children: [cell("Prepared By", true), cell(String(p.author_name || "Staff"))] }),
          new TableRow({ children: [cell("Execution Period", true), cell(`${String(p.period_start)} to ${String(p.period_end)}`)] }),
          new TableRow({ children: [cell("Status", true), cell(String(p.status).replace("_", " ").toUpperCase())] }),
          ...(p.directive_ref
            ? [
                new TableRow({
                  children: [
                    cell("Linked Directive", true),
                    cell(`${String(p.directive_ref)} — ${String(p.directive_title || "")}`),
                  ],
                }),
              ]
            : []),
        ],
      }),
      ...(p.summary
        ? [
            new Paragraph({
              text: "2. Plan Executive Overview",
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 200, after: 80 },
            }),
            new Paragraph({ text: String(p.summary), spacing: { after: 120 } }),
          ]
        : []),
      new Paragraph({
        text: `Planned Milestones & KPIs (${objectives.length})`,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 220, after: 80 },
      }),
      ...(objectives.length > 0
        ? [
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  tableHeader: true,
                  children: [
                    cell("#", true),
                    cell("Planned Activity", true),
                    cell("KPI / Deliverable", true),
                    cell("Owner", true),
                    cell("Target Date", true),
                    cell("Progress", true),
                  ],
                }),
                ...objectives.map(
                  (o, idx) =>
                    new TableRow({
                      children: [
                        cell(String(idx + 1)),
                        cell(o.activity),
                        cell(o.kpi || "—"),
                        cell(o.owner || "—"),
                        cell(o.targetDate || "—"),
                        cell(`${o.progress ?? 0}% (${(o.status || "not_started").replace("_", " ")})`),
                      ],
                    })
                ),
              ],
            }),
          ]
        : [new Paragraph({ text: "Plan submitted via attached document." })]),
      ...(p.review_notes
        ? [
            new Paragraph({
              text: "Direction & Management Review",
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 220, after: 80 },
            }),
            new Paragraph({ text: String(p.review_notes) }),
          ]
        : []),
      ...buildOfficialDocxFooterBlock({
        config: settings.letterhead_config,
        signatoryName: p.reviewer_name ? String(p.reviewer_name) : String(p.author_name || ""),
      }),
    ];

    const doc = new Document({ sections: [{ children }] });
    const buffer = await Packer.toBuffer(doc);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${safeSlug}.docx"`,
      },
    });
  }

  const html = `<!doctype html><html><head><meta charset="utf-8"/><style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; padding: 30px 36px; max-width: 840px; margin: 0 auto; line-height: 1.5; font-size: 12px; }
    ${OFFICIAL_LETTERHEAD_CSS}
    h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1.5px solid #0f172a; padding-bottom: 4px; margin: 20px 0 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #f1f5f9; font-weight: 700; }
  </style></head><body>
    ${renderOfficialLetterheadHtml({
      config: settings.letterhead_config,
      documentTitle: "Official Action Plan Submission",
      documentSubtitle: `${String(p.title)} · ${String(p.department)} (${String(p.period_start)} to ${String(p.period_end)})`,
      referenceCode: refCode,
    })}
    ${p.summary ? `<h2>Plan Overview</h2><p>${esc(String(p.summary))}</p>` : ""}
    <h2>Planned Milestones &amp; KPIs (${objectives.length})</h2>
    ${
      objectives.length === 0
        ? "<p>Action plan submitted via uploaded document attachment.</p>"
        : `<table><thead><tr><th>#</th><th>Activity</th><th>KPI</th><th>Owner</th><th>Target Date</th><th>Progress</th></tr></thead><tbody>${objectives
            .map(
              (o, i) =>
                `<tr><td>${i + 1}</td><td>${esc(o.activity)}</td><td>${esc(
                  o.kpi
                )}</td><td>${esc(o.owner)}</td><td>${esc(o.targetDate)}</td><td>${
                  o.progress ?? 0
                }%</td></tr>`
            )
            .join("")}</tbody></table>`
    }
    ${
      p.review_notes
        ? `<h2>Direction Review Notes</h2><p>${esc(String(p.review_notes))}</p>`
        : ""
    }
    ${renderOfficialFooterHtml({ config: settings.letterhead_config })}
  </body></html>`;

  try {
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "load" });
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "14mm", bottom: "14mm", left: "12mm", right: "12mm" },
      });
      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${safeSlug}.pdf"`,
        },
      });
    } finally {
      await browser.close();
    }
  } catch {
    return new NextResponse(
      html.replace("</body>", `<script>window.onload=function(){window.print();}</script></body>`),
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}

