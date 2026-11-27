import {
  AlignmentType,
  BorderStyle,
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
import type { ExecutiveSummaryResult } from "./executiveSummary";

function esc(s: string | undefined | null): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function nl2br(s: string | undefined | null): string {
  return esc(s).replace(/\n/g, "<br/>");
}

function badgeClass(status: string): string {
  switch (status) {
    case "Strong":
    case "Exceeding Target":
      return "badge-green";
    case "On Track":
      return "badge-blue";
    case "At Risk":
    case "Needs Attention":
      return "badge-amber";
    case "Critical":
    case "No Filing":
      return "badge-red";
    default:
      return "badge-gray";
  }
}

/**
 * Render boardroom-ready HTML for Playwright PDF generation or browser printing.
 */
export function renderExecutiveSummaryHtml(summary: ExecutiveSummaryResult): string {
  const { meta, metrics } = summary;
  const scopeLabel =
    meta.departmentFilter === "all"
      ? "All Subsidiaries & Business Units"
      : meta.departmentFilter;
  const reportTypeTitle =
    meta.reportType === "weekly"
      ? "Weekly Executive Holding Summary"
      : meta.reportType === "monthly"
      ? "Monthly Executive Holding Summary"
      : "Consolidated Executive Holding Summary";

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(reportTypeTitle)} — Yetaf Holding Limited</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #14243a;
    margin: 0;
    padding: 0;
    line-height: 1.5;
    font-size: 11.5px;
    background: #ffffff;
  }
  .header {
    background: #183454;
    color: #f8fafc;
    padding: 22px 28px;
    border-bottom: 4px solid #c69b43;
  }
  .header-kicker {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #e6ca7d;
    margin-bottom: 4px;
  }
  .header h1 {
    margin: 0;
    font-size: 21px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: #ffffff;
  }
  .header-meta {
    margin-top: 8px;
    font-size: 11px;
    color: #cbd5e1;
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
  }
  .container {
    padding: 22px 28px 32px;
  }
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-bottom: 20px;
  }
  .kpi-card {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px 14px;
    background: #f8fafc;
  }
  .kpi-label {
    font-size: 9.5px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 700;
    color: #64748b;
  }
  .kpi-val {
    font-size: 20px;
    font-weight: 800;
    color: #0f172a;
    margin-top: 4px;
    line-height: 1.1;
  }
  .kpi-sub {
    font-size: 10px;
    color: #475569;
    margin-top: 4px;
  }
  h2 {
    font-size: 12.5px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #0f172a;
    border-bottom: 1.5px solid #0f172a;
    padding-bottom: 4px;
    margin: 22px 0 10px;
    page-break-after: avoid;
  }
  .narrative-box {
    background: #f8fafc;
    border-left: 3.5px solid #c69b43;
    border-top: 1px solid #e2e8f0;
    border-right: 1px solid #e2e8f0;
    border-bottom: 1px solid #e2e8f0;
    border-radius: 0 8px 8px 0;
    padding: 14px 16px;
  }
  .narrative-box p {
    margin: 0 0 8px;
    color: #1e293b;
    font-size: 11.5px;
  }
  .narrative-box p:last-child { margin-bottom: 0; }
  ul.takeaways {
    margin: 10px 0 0;
    padding-left: 18px;
    color: #334155;
  }
  ul.takeaways li { margin-bottom: 4px; }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10.5px;
    margin-top: 6px;
  }
  th, td {
    border: 1px solid #cbd5e1;
    padding: 6px 8px;
    text-align: left;
    vertical-align: top;
  }
  th {
    background: #f1f5f9;
    font-weight: 700;
    color: #0f172a;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  tr { page-break-inside: avoid; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .badge {
    display: inline-block;
    padding: 2px 7px;
    border-radius: 999px;
    font-size: 9.5px;
    font-weight: 700;
    white-space: nowrap;
  }
  .badge-green, .badge-blue { background: #e9eef4; color: #183454; }
  .badge-amber, .badge-red { background: #f7eedb; color: #765510; }
  .badge-gray { background: #f1f5f9; color: #475569; }
  .item-card {
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 9px 12px;
    margin-bottom: 8px;
    page-break-inside: avoid;
  }
  .item-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
    font-size: 10.5px;
  }
  .item-title { font-weight: 700; color: #0f172a; }
  .item-meta { color: #64748b; font-size: 10px; }
  .item-body { color: #334155; font-size: 11px; margin: 0; }
  .item-secondary {
    margin-top: 5px;
    padding-top: 5px;
    border-top: 1px dashed #e2e8f0;
    color: #183454;
    font-size: 10.5px;
  }
  .empty { color: #64748b; font-style: italic; font-size: 11px; margin: 4px 0; }
  .footer {
    margin-top: 26px;
    padding-top: 10px;
    border-top: 1px solid #e2e8f0;
    font-size: 9.5px;
    color: #64748b;
    display: flex;
    justify-content: space-between;
  }
</style>
</head>
<body>
  <div class="header">
    <div class="header-kicker">YETAF HOLDING LIMITED · OFFICE OF DIRECTION &amp; REPORT FOLLOW-UP CENTER</div>
    <h1>${esc(reportTypeTitle)}</h1>
    <div class="header-meta">
      <span><strong>Period:</strong> ${esc(meta.periodLabel)}</span>
      <span><strong>Scope:</strong> ${esc(scopeLabel)}</span>
      <span><strong>Generated:</strong> ${esc(meta.generatedAtLabel)}</span>
    </div>
  </div>

  <div class="container">
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Submission Compliance</div>
        <div class="kpi-val">${metrics.complianceRate !== null ? `${metrics.complianceRate}%` : "N/A"}</div>
        <div class="kpi-sub">${metrics.submittedStaffCount} of ${metrics.trackedStaffCount} staff submitted</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Avg KPI Achievement</div>
        <div class="kpi-val">${metrics.avgAchievement !== null ? `${metrics.avgAchievement}%` : "—"}</div>
        <div class="kpi-sub">${esc(metrics.performanceBand)} (${metrics.totalKpis} KPIs)</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Reports Consolidated</div>
        <div class="kpi-val">${metrics.totalReports}</div>
        <div class="kpi-sub">${metrics.reviewedCount} reviewed · ${metrics.pendingReviewCount} pending</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Action &amp; Risk Flags</div>
        <div class="kpi-val">${metrics.supportRequestsCount + metrics.challengesCount}</div>
        <div class="kpi-sub">${metrics.supportRequestsCount} support · ${metrics.incompleteCount} incomplete</div>
      </div>
    </div>

    <h2>1. Executive Overview</h2>
    <div class="narrative-box">
      ${summary.narrativeParagraphs.map((p) => `<p>${esc(p)}</p>`).join("")}
      ${
        summary.keyTakeaways.length > 0
          ? `<ul class="takeaways">${summary.keyTakeaways
              .map((t) => `<li>${esc(t)}</li>`)
              .join("")}</ul>`
          : ""
      }
    </div>

    <h2>2. Department &amp; Subsidiary Scorecard</h2>
    ${
      summary.departments.length === 0
        ? `<p class="empty">No department data available for this selection.</p>`
        : `<table>
            <thead>
              <tr>
                <th>Department / Business Unit</th>
                <th class="num">Compliance</th>
                <th class="num">Reports</th>
                <th class="num">Reviewed</th>
                <th class="num">Avg KPI %</th>
                <th class="num">Incomplete</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${summary.departments
                .map(
                  (d) => `<tr>
                    <td><strong>${esc(d.department)}</strong></td>
                    <td class="num">${
                      d.complianceRate !== null
                        ? `${d.complianceRate}% (${d.submittedStaffCount}/${d.staffCount})`
                        : "—"
                    }</td>
                    <td class="num">${d.reportCount}</td>
                    <td class="num">${d.reviewedCount}</td>
                    <td class="num">${
                      d.avgAchievement !== null ? `${d.avgAchievement}%` : "—"
                    }</td>
                    <td class="num">${d.incompleteCount}</td>
                    <td><span class="badge ${badgeClass(d.status)}">${esc(d.status)}</span></td>
                  </tr>`
                )
                .join("")}
            </tbody>
          </table>`
    }

    <h2>3. Unit Executive Highlights (${summary.highlights.length})</h2>
    ${
      summary.highlights.length === 0
        ? `<p class="empty">No executive summary narratives submitted in this period.</p>`
        : summary.highlights
            .map(
              (h) => `<div class="item-card">
                <div class="item-head">
                  <span class="item-title">${esc(h.department)} — ${esc(h.authorName)}</span>
                  <span class="item-meta">${esc(h.reportType.toUpperCase())} · ${esc(h.periodLabel)}${
                    h.avgAchievement !== null ? ` · KPI Avg: ${h.avgAchievement}%` : ""
                  }</span>
                </div>
                <p class="item-body">${nl2br(h.summary)}</p>
              </div>`
            )
            .join("")
    }

    <h2>4. Holding Support &amp; Decisions Required (${summary.supportRequests.length})</h2>
    ${
      summary.supportRequests.length === 0
        ? `<p class="empty">No holding-level escalations or support requests recorded.</p>`
        : summary.supportRequests
            .map(
              (s) => `<div class="item-card">
                <div class="item-head">
                  <span class="item-title">${esc(s.department)} — ${esc(s.authorName)}</span>
                  <span class="item-meta">${esc(s.periodLabel)}</span>
                </div>
                <p class="item-body">${nl2br(s.text)}</p>
              </div>`
            )
            .join("")
    }

    <h2>5. Key Challenges &amp; Mitigation Actions (${summary.challenges.length})</h2>
    ${
      summary.challenges.length === 0
        ? `<p class="empty">No operational challenges reported.</p>`
        : summary.challenges
            .map(
              (c) => `<div class="item-card">
                <div class="item-head">
                  <span class="item-title">${esc(c.department)} — ${esc(c.authorName)}</span>
                  <span class="item-meta">${esc(c.periodLabel)}</span>
                </div>
                <p class="item-body">${nl2br(c.text)}</p>
                ${
                  c.secondaryText
                    ? `<div class="item-secondary"><strong>Action Taken:</strong> ${nl2br(
                        c.secondaryText
                      )}</div>`
                    : ""
                }
              </div>`
            )
            .join("")
    }

    ${
      summary.incompleteActivities.length > 0
        ? `<h2>6. Planned Activities Not Completed (${summary.incompleteActivities.length})</h2>
          <table>
            <thead>
              <tr>
                <th>Department / Staff</th>
                <th>Planned Activity</th>
                <th>Reason / Status</th>
              </tr>
            </thead>
            <tbody>
              ${summary.incompleteActivities
                .map(
                  (inc) => `<tr>
                    <td><strong>${esc(inc.department)}</strong><br/><span style="color:#64748b">${esc(
                      inc.authorName
                    )}</span></td>
                    <td>${nl2br(inc.activity)}</td>
                    <td>${nl2br(inc.reason)}</td>
                  </tr>`
                )
                .join("")}
            </tbody>
          </table>`
        : ""
    }

    <h2>${summary.incompleteActivities.length > 0 ? "7" : "6"}. Next Period Priorities &amp; Focus Areas (${
      summary.nextPriorities.length
    })</h2>
    ${
      summary.nextPriorities.length === 0
        ? `<p class="empty">No next-period priorities documented.</p>`
        : summary.nextPriorities
            .map(
              (p) => `<div class="item-card">
                <div class="item-head">
                  <span class="item-title">${esc(p.department)} — ${esc(p.authorName)}</span>
                  <span class="item-meta">${esc(p.periodLabel)}</span>
                </div>
                <p class="item-body">${nl2br(p.text)}</p>
              </div>`
            )
            .join("")
    }

    ${
      summary.nonSubmitters.length > 0
        ? `<h2>${summary.incompleteActivities.length > 0 ? "8" : "7"}. Outstanding / Non-Submitted Staff (${
            summary.nonSubmitters.length
          })</h2>
          <table>
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Department</th>
                <th>Email</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${summary.nonSubmitters
                .map(
                  (ns) => `<tr>
                    <td><strong>${esc(ns.full_name)}</strong></td>
                    <td>${esc(ns.department)}</td>
                    <td>${esc(ns.email)}</td>
                    <td><span class="badge ${
                      ns.state === "draft_only" ? "badge-amber" : "badge-red"
                    }">${ns.state === "draft_only" ? "Draft Only" : "Not Submitted"}</span></td>
                  </tr>`
                )
                .join("")}
            </tbody>
          </table>`
        : ""
    }

    <div class="footer">
      <span>Confidential · Yetaf Holding Limited Executive Portal</span>
      <span>Generated ${esc(meta.generatedAtLabel)}</span>
    </div>
  </div>
</body>
</html>`;
}

// ── DOCX Export Builder ───────────────────────────────────────────────

function docHeading(text: string) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 260, after: 110 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: "0F172A" },
    },
  });
}

function docBody(text: string, opts: { boldPrefix?: string; italic?: boolean } = {}) {
  const runs: TextRun[] = [];
  if (opts.boldPrefix) {
    runs.push(new TextRun({ text: opts.boldPrefix, bold: true }));
  }
  runs.push(new TextRun({ text: text || "—", italics: !!opts.italic }));
  return new Paragraph({
    children: runs,
    spacing: { after: 90 },
  });
}

function docCell(text: string, opts: { header?: boolean } = {}) {
  return new TableCell({
    shading: opts.header
      ? { type: ShadingType.CLEAR, color: "auto", fill: "F1F5F9" }
      : undefined,
    children: [
      new Paragraph({
        children: [new TextRun({ text: text || "", bold: !!opts.header, size: 20 })],
        spacing: { before: 40, after: 40 },
      }),
    ],
  });
}

function docTable(headers: string[], rows: string[][]) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((h) => docCell(h, { header: true })),
      }),
      ...rows.map(
        (r) =>
          new TableRow({
            children: r.map((c) => docCell(c)),
          })
      ),
    ],
  });
}

/**
 * Build a board-ready Word (.docx) Buffer from an ExecutiveSummaryResult.
 */
export async function buildExecutiveSummaryDocx(
  summary: ExecutiveSummaryResult
): Promise<Buffer> {
  const { meta, metrics } = summary;
  const scopeLabel =
    meta.departmentFilter === "all"
      ? "All Subsidiaries & Business Units"
      : meta.departmentFilter;

  const titleText =
    meta.reportType === "weekly"
      ? "YETAF HOLDING — WEEKLY EXECUTIVE SUMMARY"
      : meta.reportType === "monthly"
      ? "YETAF HOLDING — MONTHLY EXECUTIVE SUMMARY"
      : "YETAF HOLDING — CONSOLIDATED EXECUTIVE SUMMARY";

  const children: (Paragraph | Table)[] = [
    new Paragraph({
      text: titleText,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: `Period: ${meta.periodLabel}  |  Scope: ${scopeLabel}  |  Generated: ${meta.generatedAtLabel}`,
          color: "475569",
          size: 20,
        }),
      ],
    }),

    docHeading("1. Key Executive Metrics"),
    docTable(
      ["Metric", "Value", "Detail"],
      [
        [
          "Submission Compliance",
          metrics.complianceRate !== null ? `${metrics.complianceRate}%` : "N/A",
          `${metrics.submittedStaffCount} of ${metrics.trackedStaffCount} registered staff submitted`,
        ],
        [
          "Average KPI Achievement",
          metrics.avgAchievement !== null ? `${metrics.avgAchievement}%` : "—",
          `${metrics.performanceBand} across ${metrics.totalKpis} tracked KPIs (${metrics.kpisMeetingTarget} ≥80%, ${metrics.kpisBelowTarget} <60%)`,
        ],
        [
          "Consolidated Reports",
          String(metrics.totalReports),
          `${metrics.reviewedCount} reviewed · ${metrics.pendingReviewCount} pending review · ${metrics.draftCount} draft`,
        ],
        [
          "Risks & Escalations",
          String(metrics.challengesCount + metrics.supportRequestsCount),
          `${metrics.supportRequestsCount} holding support requests · ${metrics.challengesCount} challenges · ${metrics.incompleteCount} incomplete activities`,
        ],
      ]
    ),

    docHeading("2. Executive Overview"),
    ...summary.narrativeParagraphs.map((p) => docBody(p)),
  ];

  if (summary.keyTakeaways.length > 0) {
    for (const item of summary.keyTakeaways) {
      children.push(
        new Paragraph({
          text: item,
          bullet: { level: 0 },
          spacing: { after: 60 },
        })
      );
    }
  }

  children.push(docHeading("3. Department & Subsidiary Scorecard"));
  if (summary.departments.length > 0) {
    children.push(
      docTable(
        ["Department", "Compliance", "Reports", "Reviewed", "Avg KPI %", "Incomplete", "Status"],
        summary.departments.map((d) => [
          d.department,
          d.complianceRate !== null
            ? `${d.complianceRate}% (${d.submittedStaffCount}/${d.staffCount})`
            : "—",
          String(d.reportCount),
          String(d.reviewedCount),
          d.avgAchievement !== null ? `${d.avgAchievement}%` : "—",
          String(d.incompleteCount),
          d.status,
        ])
      )
    );
  } else {
    children.push(docBody("No department data recorded for this period.", { italic: true }));
  }

  children.push(docHeading(`4. Unit Executive Highlights (${summary.highlights.length})`));
  if (summary.highlights.length > 0) {
    for (const h of summary.highlights) {
      children.push(
        docBody(h.summary, {
          boldPrefix: `${h.department} — ${h.authorName} (${h.periodLabel}${
            h.avgAchievement !== null ? `, KPI ${h.avgAchievement}%` : ""
          }): `,
        })
      );
    }
  } else {
    children.push(docBody("No unit executive highlights submitted.", { italic: true }));
  }

  children.push(
    docHeading(`5. Holding Support & Decisions Required (${summary.supportRequests.length})`)
  );
  if (summary.supportRequests.length > 0) {
    for (const s of summary.supportRequests) {
      children.push(
        docBody(s.text, {
          boldPrefix: `${s.department} — ${s.authorName}: `,
        })
      );
    }
  } else {
    children.push(docBody("No holding-level support escalations.", { italic: true }));
  }

  children.push(docHeading(`6. Key Challenges & Mitigation (${summary.challenges.length})`));
  if (summary.challenges.length > 0) {
    for (const c of summary.challenges) {
      children.push(
        docBody(c.text, {
          boldPrefix: `${c.department} — ${c.authorName}: `,
        })
      );
      if (c.secondaryText) {
        children.push(
          docBody(c.secondaryText, {
            boldPrefix: "  Action Taken: ",
            italic: true,
          })
        );
      }
    }
  } else {
    children.push(docBody("No operational challenges reported.", { italic: true }));
  }

  if (summary.incompleteActivities.length > 0) {
    children.push(
      docHeading(`7. Planned Activities Not Completed (${summary.incompleteActivities.length})`)
    );
    children.push(
      docTable(
        ["Department / Staff", "Planned Activity", "Reason"],
        summary.incompleteActivities.map((inc) => [
          `${inc.department} (${inc.authorName})`,
          inc.activity,
          inc.reason,
        ])
      )
    );
  }

  const nextSectionNum = summary.incompleteActivities.length > 0 ? 8 : 7;
  children.push(
    docHeading(`${nextSectionNum}. Next Period Priorities (${summary.nextPriorities.length})`)
  );
  if (summary.nextPriorities.length > 0) {
    for (const p of summary.nextPriorities) {
      children.push(
        docBody(p.text, {
          boldPrefix: `${p.department} — ${p.authorName}: `,
        })
      );
    }
  } else {
    children.push(docBody("No next-period priorities documented.", { italic: true }));
  }

  if (summary.nonSubmitters.length > 0) {
    children.push(
      docHeading(
        `${nextSectionNum + 1}. Outstanding / Non-Submitted Staff (${summary.nonSubmitters.length})`
      )
    );
    children.push(
      docTable(
        ["Staff Member", "Department", "Email", "Status"],
        summary.nonSubmitters.map((ns) => [
          ns.full_name,
          ns.department,
          ns.email,
          ns.state === "draft_only" ? "Draft Only" : "Not Submitted",
        ])
      )
    );
  }

  const doc = new Document({
    sections: [{ children }],
  });
  return Packer.toBuffer(doc);
}

