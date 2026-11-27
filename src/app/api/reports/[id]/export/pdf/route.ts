import { NextResponse } from "next/server";
import { getReportForExport } from "@/lib/getReportForExport";
import { getCompanySettings, getPortalSettings } from "@/lib/portalSettings";
import { launchChromium } from "@/lib/officialLetterhead";
import { renderReportHtml } from "@/lib/reportHtml";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const report = await getReportForExport(id);
  if (!report) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const settings = report.company_id
    ? await getCompanySettings(report.company_id)
    : await getPortalSettings();

  // Render letterhead HTML (guarded so a letterhead failure never breaks the whole export)
  let html = "";
  try {
    html = await renderReportHtml(report, settings.letterhead_config);
  } catch (err) {
    console.warn("Report HTML render failed:", err instanceof Error ? err.message : String(err));
    // Minimal fallback HTML so we still have something to render
    html = `<!doctype html><html><head><meta charset="utf-8"/><style>body{font-family:sans-serif;padding:2rem;}</style></head><body><p>Report export failed to render.</p></body></html>`;
  }

  try {
    const browser = await launchChromium();
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "load" });
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "16mm", bottom: "16mm", left: "14mm", right: "14mm" },
      });

      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${report.report_type}-report-${report.period_start}.pdf"`,
        },
      });
    } finally {
      await browser.close();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("Headless Chromium launch failed for PDF export:", message);

    // Fallback: Return printable HTML with auto-print script triggered
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
