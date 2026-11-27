import fs from "fs";
import path from "path";
import { chromium } from "playwright-core";
import Chromium from "@sparticuz/chromium";
import {
  AlignmentType,
  BorderStyle,
  ImageRun,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import {
  DEFAULT_LETTERHEAD_CONFIG,
  type LetterheadConfig,
} from "./portalSettings";
import { sql } from "./db";

let cachedLogoBuffer: Buffer | null | undefined;

/** Read the default logo from the local filesystem (sync). */
export function getCompanyLogoBuffer(): Buffer | null {
  if (cachedLogoBuffer !== undefined) return cachedLogoBuffer;
  try {
    const logoPath = path.join(process.cwd(), "public", "logo.jpg");
    if (fs.existsSync(logoPath)) {
      cachedLogoBuffer = fs.readFileSync(logoPath);
      return cachedLogoBuffer;
    }
  } catch {
    // Fallback cleanly if filesystem read unavailable
  }
  cachedLogoBuffer = null;
  return null;
}

/**
 * Launch headless Chromium with Vercel serverless support.
 * Uses @sparticux/chromium binary when available (production/ serverless),
 * otherwise falls back to Playwright's bundled Chromium (local dev).
 */
export async function launchChromium() {
  try {
    const exePath = await Chromium.executablePath();
    return await chromium.launch({
      args: [
        ...Chromium.args,
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
      executablePath: exePath,
      headless: true,
    });
  } catch {
    // Fallback to Playwright's bundled Chromium (local development)
    return await chromium.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      headless: true,
    });
  }
}

/** Fetch a logo from an external URL and return its Buffer (server-side only). */
export async function fetchCompanyLogoBuffer(logoUrl: string): Promise<Buffer | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(logoUrl, { signal: controller.signal });
      if (!response.ok || !response.body) return null;
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return null;
  }
}

/** Resolve a logo data URI: company URL first, then local file. */
export async function getCompanyLogoDataUri(logoUrl?: string): Promise<string | null> {
  if (logoUrl) {
    const uploadedFile = logoUrl.match(/^\/api\/uploads\/([\w-]+)$/);
    if (uploadedFile) {
      try {
        const rows = await sql`
          SELECT mime_type, content_base64 FROM uploaded_files WHERE id = ${uploadedFile[1]} LIMIT 1;
        `;
        if (rows.length > 0) {
          return `data:${String(rows[0].mime_type || "image/png")};base64,${String(rows[0].content_base64)}`;
        }
      } catch {
        // Use the default logo if a stored logo is unavailable.
      }
    }
    const buf = await fetchCompanyLogoBuffer(logoUrl);
    if (buf) {
      const mime = logoUrl.match(/\.(png|webp|gif|svg)(?:[?#]|$)/i)?.[1]?.toLowerCase();
      const mimeType = mime === "png" ? "image/png" : mime === "webp" ? "image/webp" : mime === "gif" ? "image/gif" : mime === "svg" ? "image/svg+xml" : "image/jpeg";
      return `data:${mimeType};base64,${buf.toString("base64")}`;
    }
  }
  const buf = getCompanyLogoBuffer();
  if (!buf) return null;
  return `data:image/jpeg;base64,${buf.toString("base64")}`;
}

function escHtml(s: string | undefined | null): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Shared CSS for Official Company Letterhead HTML/PDF exports.
 */
export const OFFICIAL_LETTERHEAD_CSS = `
  .official-lh {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    padding-bottom: 14px;
    margin-bottom: 18px;
    border-bottom: 3px solid #0f172a;
    position: relative;
  }
  .official-lh::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: -6px;
    height: 1.5px;
    background: #b48628;
  }
  .official-lh-brand {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .official-lh-logo {
    width: 128px;
    height: 62px;
    max-width: 128px;
    max-height: 62px;
    flex: 0 0 128px;
    object-fit: contain;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 3px;
    background: #ffffff;
  }
  .official-lh-org {
    font-size: 18px;
    font-weight: 800;
    letter-spacing: 0.04em;
    color: #0f172a;
    margin: 0;
    line-height: 1.15;
  }
  .official-lh-sub {
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #b48628;
    margin: 3px 0 2px;
  }
  .official-lh-addr {
    font-size: 9.5px;
    color: #475569;
    margin: 0;
  }
  .official-lh-ref {
    text-align: right;
    font-size: 10px;
    color: #334155;
    line-height: 1.5;
    white-space: nowrap;
  }
  .official-lh-ref strong {
    color: #0f172a;
  }
  .official-doc-title-bar {
    text-align: center;
    margin: 18px 0 14px;
  }
  .official-doc-title {
    font-size: 17px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #0f172a;
    margin: 0;
  }
  .official-doc-subtitle {
    font-size: 11px;
    color: #475569;
    margin: 4px 0 0;
  }
  .official-footer {
    margin-top: 28px;
    padding-top: 10px;
    border-top: 1.5px solid #cbd5e1;
    display: flex;
    justify-content: space-between;
    font-size: 9.5px;
    color: #64748b;
  }
`;

export async function renderOfficialLetterheadHtml(opts: {
  config?: LetterheadConfig;
  documentTitle: string;
  documentSubtitle?: string;
  referenceCode?: string;
  dateLabel?: string;
}): Promise<string> {
  const cfg = opts.config || DEFAULT_LETTERHEAD_CONFIG;
  const logoUri = cfg.logo_url
    ? await getCompanyLogoDataUri(cfg.logo_url)
    : await getCompanyLogoDataUri();
  const dateStr =
    opts.dateLabel ||
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Africa/Addis_Ababa",
      dateStyle: "medium",
    }).format(new Date());

  return `
    <div class="official-lh">
      <div class="official-lh-brand">
        ${
          logoUri
            ? `<img src="${logoUri}" alt="${escHtml(cfg.organizationName)}" class="official-lh-logo" width="128" height="62" style="width:128px;height:62px;max-width:128px;max-height:62px;object-fit:contain;display:block;flex:0 0 128px;" />`
            : ""
        }
        <div>
          <p class="official-lh-org">${escHtml(cfg.organizationName)}</p>
          <p class="official-lh-sub">${escHtml(cfg.divisionSubtitle)}</p>
          <p class="official-lh-addr">${escHtml(cfg.addressLine)} &middot; ${escHtml(cfg.contactLine)}</p>
        </div>
      </div>
      <div class="official-lh-ref">
        ${opts.referenceCode ? `<div><strong>Ref:</strong> ${escHtml(opts.referenceCode)}</div>` : ""}
        <div><strong>Date:</strong> ${escHtml(dateStr)}</div>
      </div>
    </div>
    <div class="official-doc-title-bar">
      <h1 class="official-doc-title">${escHtml(opts.documentTitle)}</h1>
      ${
        opts.documentSubtitle
          ? `<p class="official-doc-subtitle">${escHtml(opts.documentSubtitle)}</p>`
          : ""
      }
    </div>
  `;
}

export function renderOfficialFooterHtml(opts?: {
  config?: LetterheadConfig;
  generatedAt?: string;
}): string {
  const cfg = opts?.config || DEFAULT_LETTERHEAD_CONFIG;
  return `
    <div class="official-footer">
      <span>${escHtml(cfg.footerNotice)}</span>
      <span>${escHtml(opts?.generatedAt || cfg.signatoryTitle)}</span>
    </div>
  `;
}

/**
 * Builds an official corporate letterhead header block for Word (.docx) documents,
 * embedding the company logo alongside standardized YETAF Holding typography,
 * gold/navy double divider, reference code, and date.
 */
export function buildOfficialDocxLetterhead(opts: {
  config?: LetterheadConfig;
  documentTitle: string;
  documentSubtitle?: string;
  referenceCode?: string;
  dateLabel?: string;
}): (Paragraph | Table)[] {
  const cfg = opts.config || DEFAULT_LETTERHEAD_CONFIG;
  const logoBuf = getCompanyLogoBuffer();
  const dateStr =
    opts.dateLabel ||
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Africa/Addis_Ababa",
      dateStyle: "medium",
    }).format(new Date());

  const noBorder = {
    top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  };

  const brandCells: TableCell[] = [];

  if (logoBuf) {
    brandCells.push(
      new TableCell({
        width: { size: 15, type: WidthType.PERCENTAGE },
        borders: noBorder,
        children: [
          new Paragraph({
            children: [
              new ImageRun({
                data: logoBuf,
                type: "jpg",
                transformation: { width: 108, height: 50 },
              }),
            ],
          }),
        ],
      })
    );
  }

  brandCells.push(
    new TableCell({
      width: { size: logoBuf ? 60 : 75, type: WidthType.PERCENTAGE },
      borders: noBorder,
      children: [
        new Paragraph({
          spacing: { after: 30 },
          children: [
            new TextRun({
              text: cfg.organizationName,
              bold: true,
              size: 28,
              color: "0F172A",
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 30 },
          children: [
            new TextRun({
              text: cfg.divisionSubtitle,
              bold: true,
              size: 16,
              color: "B48628",
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `${cfg.addressLine} · ${cfg.contactLine}`,
              size: 16,
              color: "475569",
            }),
          ],
        }),
      ],
    })
  );

  brandCells.push(
    new TableCell({
      width: { size: 25, type: WidthType.PERCENTAGE },
      borders: noBorder,
      children: [
        ...(opts.referenceCode
          ? [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: 30 },
                children: [
                  new TextRun({ text: "Ref: ", bold: true, size: 18, color: "0F172A" }),
                  new TextRun({ text: opts.referenceCode, size: 18, color: "334155" }),
                ],
              }),
            ]
          : []),
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [
            new TextRun({ text: "Date: ", bold: true, size: 18, color: "0F172A" }),
            new TextRun({ text: dateStr, size: 18, color: "334155" }),
          ],
        }),
      ],
    })
  );

  const elements: (Paragraph | Table)[] = [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        bottom: { style: BorderStyle.DOUBLE, size: 12, color: "B48628" },
      },
      rows: [new TableRow({ children: brandCells })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 220, after: 60 },
      children: [
        new TextRun({
          text: opts.documentTitle.toUpperCase(),
          bold: true,
          size: 26,
          color: "0F172A",
        }),
      ],
    }),
  ];

  if (opts.documentSubtitle) {
    elements.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 220 },
        children: [
          new TextRun({
            text: opts.documentSubtitle,
            size: 19,
            color: "475569",
          }),
        ],
      })
    );
  }

  return elements;
}

export function buildOfficialDocxFooterBlock(opts?: {
  config?: LetterheadConfig;
  signatoryName?: string | null;
}): Paragraph[] {
  const cfg = opts?.config || DEFAULT_LETTERHEAD_CONFIG;
  return [
    new Paragraph({
      spacing: { before: 320, after: 40 },
      border: {
        top: { style: BorderStyle.SINGLE, size: 6, color: "CBD5E1" },
      },
      children: [
        new TextRun({
          text: opts?.signatoryName
            ? `Authorized by: ${opts.signatoryName} · ${cfg.signatoryTitle}`
            : cfg.signatoryTitle,
          bold: true,
          size: 18,
          color: "0F172A",
        }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: cfg.footerNotice,
          italics: true,
          size: 16,
          color: "64748B",
        }),
      ],
    }),
  ];
}

