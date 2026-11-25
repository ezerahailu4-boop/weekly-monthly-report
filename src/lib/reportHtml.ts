import type { ReportRow, WeeklyReportData, MonthlyReportData } from "@/types/report";
import type { LetterheadConfig } from "./portalSettings";
import {
  OFFICIAL_LETTERHEAD_CSS,
  renderOfficialFooterHtml,
  renderOfficialLetterheadHtml,
} from "./officialLetterhead";

function esc(s: string | undefined | null) {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function nl2br(s: string | undefined | null) {
  return esc(s).replace(/\n/g, "<br/>");
}

const baseStyles = `
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Georgia, serif; color: #0f172a; padding: 34px 40px; max-width: 840px; margin: 0 auto; line-height: 1.5; }
  ${OFFICIAL_LETTERHEAD_CSS}
  h2 { font-size: 13px; margin-top: 22px; margin-bottom: 8px; border-bottom: 1.5px solid #0f172a; padding-bottom: 4px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; color: #0f172a; }
  h3 { font-size: 12.5px; margin-top: 14px; margin-bottom: 4px; font-weight: 600; color: #166534; }
  p { font-size: 12px; line-height: 1.6; margin: 4px 0; color: #334155; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
  th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f8fafc; font-weight: 600; color: #0f172a; }
  .review-box { margin-top: 24px; border: 1.5px solid #2563eb; background: #eff6ff; padding: 16px; border-radius: 8px; }
  .review-box h2 { border-bottom: 1px solid #93c5fd; color: #1e3a8a; margin-top: 0; padding-bottom: 4px; }
  .review-box p { color: #1e3a8a; }
`;

function renderExecutiveReviewBlock(report: ReportRow): string {
  if (report.status !== "reviewed" && !report.review_notes) return "";

  return `
    <div class="review-box">
      <h2>8. Direction &amp; Board Review</h2>
      <p><strong>Review Status:</strong> ${report.status === "reviewed" ? "Approved &amp; Formally Signed-off" : "Under Direction Review"}</p>
      ${report.reviewer_name ? `<p><strong>Reviewing Officer:</strong> ${esc(report.reviewer_name)}</p>` : ""}
      ${report.reviewed_at ? `<p><strong>Sign-off Date:</strong> ${esc(report.reviewed_at.slice(0, 10))}</p>` : ""}
      <p style="margin-top: 8px;"><strong>Direction Guidance &amp; Follow-up Directives:</strong></p>
      <p style="white-space: pre-wrap; font-style: italic;">${nl2br(report.review_notes || "Report approved with no exceptions.")}</p>
    </div>
  `;
}

export async function renderWeeklyHtml(report: ReportRow, letterhead?: LetterheadConfig): Promise<string> {
  // report.data can be NULL in the DB; guard against it so the page never crashes.
  const d = (report.data as Partial<WeeklyReportData> | null) || {};
  const refCode = `${letterhead?.referencePrefix || "YH-DFC"}-WK-${report.period_start.replace(/-/g, "")}`;
  return `<!doctype html><html><head><meta charset="utf-8"/><style>${baseStyles}</style></head><body>
  ${await renderOfficialLetterheadHtml({
    config: letterhead,
    documentTitle: "Weekly Performance Report",
    documentSubtitle: `${d.reportingWeekFrom || report.period_start} to ${d.reportingWeekTo || report.period_end} · ${report.author_department || "Division"}`,
    referenceCode: refCode,
  })}

  <h2>1. Reporting Information</h2>
  <p><strong>Reporting week:</strong> From ${esc(d.reportingWeekFrom || report.period_start)} to ${esc(d.reportingWeekTo || report.period_end)}</p>
  <p><strong>Prepared by:</strong> ${esc(d.preparedBy || report.author_name || "Staff Member")}</p>

  <h2>2. Executive Summary (complete in 3–5 short)</h2>
  <p>${nl2br(d.executiveSummary)}</p>

  <h2>3. Weekly KPI and Activity Performance</h2>
  <table>
    <thead><tr><th style="width: 36px; text-align: center;">No.</th><th>KPI / planned activity</th><th>Weekly target</th><th>Performance</th><th>% Achievement</th><th>Remark</th></tr></thead>
    <tbody>
      ${(d.kpiRows || [])
        .map(
          (r, i) =>
            `<tr><td style="text-align: center;">${i + 1}</td><td>${esc(r.kpi)}</td><td>${esc(
              r.target
            )}</td><td>${esc(
              r.performance
            )}</td><td>${esc(r.percentAchievement)}</td><td>${esc(r.remark)}</td></tr>`
        )
        .join("")}
    </tbody>
  </table>

  <h2>4. Activities Planned but Not Completed if any</h2>
  <table>
    <thead><tr><th style="width: 36px; text-align: center;">No.</th><th>Planned activity</th><th>Reason not completed</th></tr></thead>
    <tbody>
      ${(d.incompleteRows || [])
        .map((r, i) => `<tr><td style="text-align: center;">${i + 1}</td><td>${esc(r.activity)}</td><td>${esc(r.reason)}</td></tr>`)
        .join("")}
    </tbody>
  </table>

  <h2>5. Challenges and Actions taken to mitigate the challenges</h2>
  <p>${nl2br(d.challenges)}</p>

  <h2>6. Priorities for the Coming Week</h2>
  <p>${nl2br(d.prioritiesNextWeek)}</p>

  <h2>7. Support or Decisions Required from Direction</h2>
  <p>${nl2br(d.supportRequired)}</p>

  ${renderExecutiveReviewBlock(report)}
  ${renderOfficialFooterHtml({ config: letterhead })}
  </body></html>`;
}

export async function renderMonthlyHtml(report: ReportRow, letterhead?: LetterheadConfig): Promise<string> {
  const d = (report.data as Partial<MonthlyReportData> | null) || {};
  const refCode = `${letterhead?.referencePrefix || "YH-DFC"}-MO-${report.period_start.replace(/-/g, "")}`;
  return `<!doctype html><html><head><meta charset="utf-8"/><style>${baseStyles}</style></head><body>
  ${await renderOfficialLetterheadHtml({
    config: letterhead,
    documentTitle: "Monthly Progress Report",
    documentSubtitle: `${report.period_start} to ${report.period_end} · ${report.author_department || "Division"}`,
    referenceCode: refCode,
  })}

  <h2>1. Status of Management Directions Given in the last reporting section</h2>
  <p>${nl2br(d.statusOfDirections)}</p>

  <h2>2. Executive Summary</h2>
  <p>${nl2br(d.executiveSummary)}</p>

  <h2>3. Goals and planned activities Performance</h2>
  <table>
    <thead><tr><th style="width: 36px; text-align: center;">S/N</th><th>Planned activities</th><th>/KPI /</th><th>Target</th><th>Actual Performance</th><th>Percentage</th><th>Remarks</th></tr></thead>
    <tbody>
      ${(d.goalRows || [])
        .map(
          (r, i) =>
            `<tr><td style="text-align: center;">${i + 1}</td><td>${esc(r.plannedActivity)}</td><td>${esc(
              r.kpi
            )}</td><td>${esc(r.target)}</td><td>${esc(r.actualPerformance)}</td><td>${esc(
              r.percentage
            )}</td><td>${esc(r.remarks)}</td></tr>`
        )
        .join("")}
    </tbody>
  </table>

  <h2>4. Additional Activities Completed and Planned Activities Not Executed</h2>
  <h3>Additional Activities performed</h3>
  <p>${nl2br(d.additionalActivitiesPerformed)}</p>
  <h3>Activities planned but not executed</h3>
  <p>${nl2br(d.activitiesPlannedNotExecuted)}</p>

  <h2>5. Challenges And Action Taken to Overcome the Challenge</h2>
  <h3>Challenge encountered.</h3>
  <p>${nl2br(d.challengeEncountered)}</p>
  <h3>Action taken to solve / Address/ the challenge</h3>
  <p>${nl2br(d.actionTaken)}</p>

  <h2>6. Follow-up, Support, and Evaluation Activities Conducted</h2>
  <h3>Support and Follow-up Activities Conducted During the Period</h3>
  <p>${nl2br(d.supportAndFollowUp)}</p>

  <h2>7. Performance Focus Areas for Next Month</h2>
  <p>${nl2br(d.focusAreasNextMonth)}</p>

  ${renderExecutiveReviewBlock(report)}
  ${renderOfficialFooterHtml({ config: letterhead })}
  </body></html>`;
}

export async function renderReportHtml(report: ReportRow, letterhead?: LetterheadConfig): Promise<string> {
  return report.report_type === "weekly"
    ? renderWeeklyHtml(report, letterhead)
    : renderMonthlyHtml(report, letterhead);
}
