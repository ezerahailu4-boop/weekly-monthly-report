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
import type { DirectionPoint } from "@/types/directive";

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

  const [settings, rows, tasks] = await Promise.all([
    getPortalSettings(),
    sql`
      SELECT d.id, d.reference_code, d.title, d.department, d.priority,
             d.directions, d.executive_summary, d.status,
             to_char(d.due_date, 'YYYY-MM-DD') as due_date,
             d.sla_days, d.created_at, u.full_name as created_by_name
      FROM directives d
      LEFT JOIN users u ON d.created_by = u.id
      WHERE d.id = ${id}
      LIMIT 1;
    `,
    sql`
      SELECT t.title, t.status, t.priority, to_char(t.due_date, 'YYYY-MM-DD') as due_date,
             u.full_name as assignee_name, u.department as assignee_department
      FROM tasks t
      JOIN users u ON t.assigned_to = u.id
      WHERE t.directive_id = ${id}
      ORDER BY t.created_at ASC;
    `,
  ]);

  if (rows.length === 0) {
    return NextResponse.json({ error: "Directive not found" }, { status: 404 });
  }

  const d = rows[0];
  const directions: DirectionPoint[] = Array.isArray(d.directions) ? d.directions : [];
  const refCode = String(d.reference_code);
  const safeSlug = refCode.toLowerCase().replace(/[^a-z0-9-]+/g, "-");

  if (format === "docx") {
    const children: (Paragraph | Table)[] = [
      ...buildOfficialDocxLetterhead({
        config: settings.letterhead_config,
        documentTitle: "Official Executive Directive",
        documentSubtitle: `${String(d.department)} · Priority: ${String(d.priority).toUpperCase()} · SLA Response: ${d.sla_days} Days`,
        referenceCode: refCode,
      }),
      new Paragraph({
        text: "1. Directive Metadata",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 80 },
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [cell("Title", true), cell(String(d.title))] }),
          new TableRow({ children: [cell("Target Division", true), cell(String(d.department))] }),
          new TableRow({ children: [cell("Issued By", true), cell(String(d.created_by_name || "Office of Direction"))] }),
          new TableRow({ children: [cell("Status / Deadline", true), cell(`${String(d.status).replace("_", " ").toUpperCase()}${d.due_date ? ` · Due ${d.due_date}` : ""}`)] }),
        ],
      }),
      new Paragraph({
        text: "2. Synthesized Executive Summary",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 220, after: 80 },
      }),
      new Paragraph({
        text: String(d.executive_summary || "—"),
        spacing: { after: 120 },
      }),
      new Paragraph({
        text: `3. Specific Directions Issued (${directions.length})`,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 220, after: 80 },
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            tableHeader: true,
            children: [cell("#", true), cell("Direction Mandate", true), cell("Owner", true), cell("Target Date", true)],
          }),
          ...directions.map(
            (pt, idx) =>
              new TableRow({
                children: [
                  cell(String(idx + 1)),
                  cell(pt.text),
                  cell(pt.owner || "Assigned Unit"),
                  cell(pt.due_date || String(d.due_date || "—")),
                ],
              })
          ),
        ],
      }),
      new Paragraph({
        text: `4. Concurrent Follow-up Tasks (${tasks.length})`,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 220, after: 80 },
      }),
      ...(tasks.length > 0
        ? [
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  tableHeader: true,
                  children: [cell("Task", true), cell("Assignee", true), cell("Priority", true), cell("Due Date", true), cell("Status", true)],
                }),
                ...tasks.map(
                  (t) =>
                    new TableRow({
                      children: [
                        cell(String(t.title)),
                        cell(`${String(t.assignee_name)} (${String(t.assignee_department || "")})`),
                        cell(String(t.priority).toUpperCase()),
                        cell(String(t.due_date || "—")),
                        cell(String(t.status).replace("_", " ").toUpperCase()),
                      ],
                    })
                ),
              ],
            }),
          ]
        : [new Paragraph({ text: "No tasks assigned under this directive yet." })]),
      ...buildOfficialDocxFooterBlock({
        config: settings.letterhead_config,
        signatoryName: d.created_by_name ? String(d.created_by_name) : null,
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
    .summary { background: #f8fafc; border-left: 3.5px solid #b48628; border: 1px solid #e2e8f0; border-left-width: 4px; padding: 12px 14px; border-radius: 6px; white-space: pre-wrap; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #f1f5f9; font-weight: 700; }
  </style></head><body>
    ${renderOfficialLetterheadHtml({
      config: settings.letterhead_config,
      documentTitle: "Official Executive Directive",
      documentSubtitle: `${String(d.title)} · ${String(d.department)}`,
      referenceCode: refCode,
    })}
    <h2>1. Executive Summary</h2>
    <div class="summary">${esc(String(d.executive_summary || "—"))}</div>
    <h2>2. Issued Directions (${directions.length})</h2>
    <table>
      <thead><tr><th style="width:32px">#</th><th>Direction</th><th>Owner</th><th>Target Date</th></tr></thead>
      <tbody>
        ${directions
          .map(
            (pt, i) =>
              `<tr><td>${i + 1}</td><td>${esc(pt.text)}</td><td>${esc(
                pt.owner || "Assigned Unit"
              )}</td><td>${esc(pt.due_date || String(d.due_date || "—"))}</td></tr>`
          )
          .join("")}
      </tbody>
    </table>
    <h2>3. Concurrent Tasks (${tasks.length})</h2>
    ${
      tasks.length === 0
        ? "<p>No linked tasks recorded yet.</p>"
        : `<table><thead><tr><th>Task</th><th>Assignee</th><th>Priority</th><th>Due</th><th>Status</th></tr></thead><tbody>${tasks
            .map(
              (t) =>
                `<tr><td>${esc(String(t.title))}</td><td>${esc(
                  String(t.assignee_name)
                )}</td><td>${esc(String(t.priority).toUpperCase())}</td><td>${esc(
                  String(t.due_date || "—")
                )}</td><td>${esc(String(t.status).replace("_", " ").toUpperCase())}</td></tr>`
            )
            .join("")}</tbody></table>`
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

