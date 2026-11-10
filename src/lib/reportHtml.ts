import type { ReportRow, WeeklyReportData, MonthlyReportData } from "@/types/report";

function esc(s: string | undefined | null) {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function nl2br(s: string | undefined | null) {
  return esc(s).replace(/\n/g, "<br/>");
}

const baseStyles = `
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Georgia, serif; color: #0f172a; padding: 40px; max-width: 840px; margin: 0 auto; line-height: 1.5; }
  h1 { font-size: 22px; text-align: center; margin-bottom: 4px; font-weight: 700; color: #0f172a; }
  h2 { font-size: 14px; margin-top: 24px; margin-bottom: 8px; border-bottom: 1.5px solid #0f172a; padding-bottom: 4px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; color: #0f172a; }
  h3 { font-size: 13px; margin-top: 14px; margin-bottom: 4px; font-weight: 600; color: #166534; }
  p { font-size: 12px; line-height: 1.6; margin: 4px 0; color: #334155; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
  th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f8fafc; font-weight: 600; color: #0f172a; }
  .meta { font-size: 12px; color: #166534; text-align: center; margin-bottom: 24px; font-weight: 500; }
  .review-box { margin-top: 24px; border: 1.5px solid #2563eb; background: #eff6ff; padding: 16px; border-radius: 8px; }
  .review-box h2 { border-bottom: 1px solid #93c5fd; color: #1e3a8a; margin-top: 0; padding-bottom: 4px; }
  .review-box p { color: #1e3a8a; }
`;

function renderExecutiveReviewBlock(report: ReportRow): string {
  if (report.status !== "reviewed" && !report.review_notes) return "";

  return `
    <div class="review-box">
      <h2>8. Executive Management &amp; Board Review</h2>
      <p><strong>Review Status:</strong> ${report.status === "reviewed" ? "Approved &amp; Formally Signed-off" : "Under Leadership Review"}</p>
      ${report.reviewer_name ? `<p><strong>Reviewing Executive:</strong> ${esc(report.reviewer_name)}</p>` : ""}
      ${report.reviewed_at ? `<p><strong>Sign-off Date:</strong> ${esc(report.reviewed_at.slice(0, 10))}</p>` : ""}
      <p style="margin-top: 8px;"><strong>Executive Guidance &amp; Directives:</strong></p>
      <p style="white-space: pre-wrap; font-style: italic;">${nl2br(report.review_notes || "Report approved with no exceptions.")}</p>
    </div>
  `;
}

export function renderWeeklyHtml(report: ReportRow): string {
  const d = report.data as WeeklyReportData;
  return `<!doctype html><html><head><meta charset="utf-8"/><style>${baseStyles}</style></head><body>
  <h1>Weekly Performance Report</h1>
  <p class="meta">${esc(d.reportingWeekFrom || report.period_start)} to ${esc(d.reportingWeekTo || report.period_end)} &middot; Yetaf Holding Limited</p>

  <h2>1. Reporting Information</h2>
  <p><strong>Reporting week:</strong> From ${esc(d.reportingWeekFrom || report.period_start)} to ${esc(d.reportingWeekTo || report.period_end)}</p>
  <p><strong>Prepared by:</strong> ${esc(d.preparedBy || report.author_name || "Staff Member")}</p>

  <h2>2. Executive Summary (complete in 3–5 short)</h2>
  <p>${nl2br(d.executiveSummary)}</p>

  <h2>3. Weekly KPI and Activity Performance</h2>
  <table>
    <thead><tr><th style="width: 36px; text-align: center;">No.</th><th>KPI / planned activity</th><th>Weekly target</th><th>Performance</th><th>% Achievement</th><th>Remark</th></tr></thead>
    <tbody>
      ${d.kpiRows
        .map(
          (r, i) =>
            `<tr><td style="text-align: center;">${i + 1}</td><td>${esc(r.kpi)}</td><td>${esc(r.target)}</td><td>${esc(
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
      ${d.incompleteRows
        .map((r, i) => `<tr><td style="text-align: center;">${i + 1}</td><td>${esc(r.activity)}</td><td>${esc(r.reason)}</td></tr>`)
        .join("")}
    </tbody>
  </table>

  <h2>5. Challenges and Actions taken to mitigate the challenges</h2>
  <p>${nl2br(d.challenges)}</p>

  <h2>6. Priorities for the Coming Week</h2>
  <p>${nl2br(d.prioritiesNextWeek)}</p>

  <h2>7. Support or Decisions Required from the Holding</h2>
  <p>${nl2br(d.supportRequired)}</p>

  ${renderExecutiveReviewBlock(report)}
  </body></html>`;
}

export function renderMonthlyHtml(report: ReportRow): string {
  const d = report.data as MonthlyReportData;
  return `<!doctype html><html><head><meta charset="utf-8"/><style>${baseStyles}</style></head><body>
  <h1>YETAF HOLDING Month progress report</h1>
  <p class="meta">${esc(report.period_start)} to ${esc(report.period_end)} &middot; Yetaf Holding Limited</p>

  <h2>1. Status of Management Directions Given in the last reporting section</h2>
  <p>${nl2br(d.statusOfDirections)}</p>

  <h2>2. Executive summary</h2>
  <p>${nl2br(d.executiveSummary)}</p>

  <h2>3. Goals and planned activities Performance</h2>
  <table>
    <thead><tr><th style="width: 36px; text-align: center;">S/N</th><th>Planned activities</th><th>/KPI /</th><th>Target</th><th>Actual Performance</th><th>Percentage</th><th>Remarks</th></tr></thead>
    <tbody>
      ${d.goalRows
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
  </body></html>`;
}

export function renderReportHtml(report: ReportRow): string {
  return report.report_type === "weekly" ? renderWeeklyHtml(report) : renderMonthlyHtml(report);
}
