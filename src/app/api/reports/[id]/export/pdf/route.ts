import { NextResponse } from "next/server";
import { chromium } from "playwright";
import { getReportForExport } from "@/lib/getReportForExport";
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

  const html = renderReportHtml(report);

  try {
    const browser = await chromium.launch();
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
