import crypto from "crypto";
import { sql } from "./db";
import { getPortalSettings } from "./portalSettings";
import { getMonthBounds, getWeekBounds } from "./compliancePeriods";
import { ETHIOPIA_TIMEZONE, evaluateReportingWindow } from "./windowSchedule";
import {
  escapeTelegramHtml,
  sendTelegramDocument,
  sendTelegramMessage,
} from "./telegram";
import {
  buildWarningLetterDocx,
  composeWarningLetterContent,
} from "./warningLetter";
import type { ReportType } from "@/types/report";
import type {
  DisciplinaryWarningRow,
  WarningLevel,
  WarningTriggerSource,
} from "@/types/warning";

function toIso(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (typeof val === "string") return val;
  if (val instanceof Date) return val.toISOString();
  return String(val);
}

function toIsoOrNull(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === "string") return val;
  if (val instanceof Date) return val.toISOString();
  return String(val);
}

export function formatEthDateLabel(val?: string | Date | null): string {
  const dt = val ? (typeof val === "string" ? new Date(val) : val) : new Date();
  return new Intl.DateTimeFormat("en-US", {
    timeZone: ETHIOPIA_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(dt) + " EAT";
}

function mapWarningRow(r: Record<string, unknown>): DisciplinaryWarningRow {
  return {
    id: String(r.id),
    user_id: String(r.user_id),
    issued_by: r.issued_by ? String(r.issued_by) : null,
    report_type: r.report_type as ReportType,
    period_start: String(r.period_start),
    period_end: String(r.period_end),
    period_label: String(r.period_label),
    strike_number: Number(r.strike_number),
    warning_level: r.warning_level as WarningLevel,
    letter_ref: r.letter_ref ? String(r.letter_ref) : null,
    letter_subject: r.letter_subject ? String(r.letter_subject) : null,
    letter_body: r.letter_body ? String(r.letter_body) : null,
    trigger_source: (r.trigger_source as WarningTriggerSource) || "manual",
    status: (r.status as DisciplinaryWarningRow["status"]) || "active",
    acknowledged_at: toIsoOrNull(r.acknowledged_at),
    telegram_sent_at: toIsoOrNull(r.telegram_sent_at),
    telegram_error: r.telegram_error ? String(r.telegram_error) : null,
    created_at: toIso(r.created_at),
    employee_name: r.employee_name ? String(r.employee_name) : null,
    employee_email: r.employee_email ? String(r.employee_email) : null,
    employee_department: r.employee_department ? String(r.employee_department) : null,
    employee_telegram_chat_id: r.employee_telegram_chat_id
      ? String(r.employee_telegram_chat_id)
      : null,
    issued_by_name: r.issued_by_name ? String(r.issued_by_name) : null,
  };
}

export async function getWarningsList(
  userId?: string | null
): Promise<DisciplinaryWarningRow[]> {
  try {
    const rows = userId
      ? await sql`
          SELECT w.id, w.user_id, w.issued_by, w.report_type,
                 to_char(w.period_start, 'YYYY-MM-DD') AS period_start,
                 to_char(w.period_end, 'YYYY-MM-DD') AS period_end,
                 w.period_label, w.strike_number, w.warning_level,
                 w.letter_ref, w.letter_subject, w.letter_body,
                 w.trigger_source, w.status, w.acknowledged_at,
                 w.telegram_sent_at, w.telegram_error, w.created_at,
                 u.full_name AS employee_name, u.email AS employee_email,
                 u.department AS employee_department,
                 u.telegram_chat_id AS employee_telegram_chat_id,
                 ib.full_name AS issued_by_name
          FROM disciplinary_warnings w
          JOIN users u ON w.user_id = u.id
          LEFT JOIN users ib ON w.issued_by = ib.id
          WHERE w.user_id = ${userId}
          ORDER BY w.created_at DESC;
        `
      : await sql`
          SELECT w.id, w.user_id, w.issued_by, w.report_type,
                 to_char(w.period_start, 'YYYY-MM-DD') AS period_start,
                 to_char(w.period_end, 'YYYY-MM-DD') AS period_end,
                 w.period_label, w.strike_number, w.warning_level,
                 w.letter_ref, w.letter_subject, w.letter_body,
                 w.trigger_source, w.status, w.acknowledged_at,
                 w.telegram_sent_at, w.telegram_error, w.created_at,
                 u.full_name AS employee_name, u.email AS employee_email,
                 u.department AS employee_department,
                 u.telegram_chat_id AS employee_telegram_chat_id,
                 ib.full_name AS issued_by_name
          FROM disciplinary_warnings w
          JOIN users u ON w.user_id = u.id
          LEFT JOIN users ib ON w.issued_by = ib.id
          ORDER BY w.created_at DESC;
        `;

    return rows.map((r) => mapWarningRow(r as Record<string, unknown>));
  } catch (err) {
    console.error("Error fetching disciplinary_warnings:", err);
    return [];
  }
}

export async function getWarningById(
  warningId: string
): Promise<DisciplinaryWarningRow | null> {
  const rows = await sql`
    SELECT w.id, w.user_id, w.issued_by, w.report_type,
           to_char(w.period_start, 'YYYY-MM-DD') AS period_start,
           to_char(w.period_end, 'YYYY-MM-DD') AS period_end,
           w.period_label, w.strike_number, w.warning_level,
           w.letter_ref, w.letter_subject, w.letter_body,
           w.trigger_source, w.status, w.acknowledged_at,
           w.telegram_sent_at, w.telegram_error, w.created_at,
           u.full_name AS employee_name, u.email AS employee_email,
           u.department AS employee_department,
           u.telegram_chat_id AS employee_telegram_chat_id,
           ib.full_name AS issued_by_name
    FROM disciplinary_warnings w
    JOIN users u ON w.user_id = u.id
    LEFT JOIN users ib ON w.issued_by = ib.id
    WHERE w.id = ${warningId}
    LIMIT 1;
  `;
  if (rows.length === 0) return null;
  return mapWarningRow(rows[0] as Record<string, unknown>);
}

export async function buildDocxBufferForWarning(
  warning: DisciplinaryWarningRow
): Promise<Buffer> {
  const priorRows = await sql`
    SELECT period_label, created_at
    FROM disciplinary_warnings
    WHERE user_id = ${warning.user_id}
      AND status <> 'revoked'
      AND id <> ${warning.id}
      AND created_at <= ${warning.created_at}::timestamptz
    ORDER BY created_at ASC
    LIMIT 1;
  `;

  const prior = priorRows[0];
  return buildWarningLetterDocx({
    letterRef: warning.letter_ref || `YH-WL-${warning.id.slice(0, 8).toUpperCase()}`,
    issuedDateLabel: formatEthDateLabel(warning.created_at),
    employeeName:
      warning.employee_name ||
      warning.employee_email?.split("@")[0] ||
      "Staff Member",
    employeeEmail: warning.employee_email || "",
    department: warning.employee_department || "Operations",
    reportType: warning.report_type,
    periodLabel: warning.period_label,
    periodStart: warning.period_start,
    periodEnd: warning.period_end,
    strikeNumber: warning.strike_number,
    priorWarningDateLabel: prior ? formatEthDateLabel(prior.created_at) : null,
    priorWarningPeriodLabel: prior ? String(prior.period_label) : null,
    issuedByName: warning.issued_by_name,
    subject: warning.letter_subject || undefined,
    body: warning.letter_body || undefined,
  });
}

export async function deliverWarningTelegram(params: {
  warningId: string;
  portalOrigin?: string | null;
}): Promise<{ sent: boolean; error?: string }> {
  const [settings, warning] = await Promise.all([
    getPortalSettings(),
    getWarningById(params.warningId),
  ]);

  if (!warning) {
    return { sent: false, error: "Warning record not found." };
  }

  if (!settings.telegram_bot_token) {
    const errMsg = "Telegram bot token is not configured.";
    await sql`
      UPDATE disciplinary_warnings
      SET telegram_error = ${errMsg}
      WHERE id = ${warning.id};
    `;
    return { sent: false, error: errMsg };
  }

  if (!warning.employee_telegram_chat_id) {
    const errMsg = "Employee has not linked their Telegram account yet.";
    await sql`
      UPDATE disciplinary_warnings
      SET telegram_error = ${errMsg}
      WHERE id = ${warning.id};
    `;
    return { sent: false, error: errMsg };
  }

  const origin = (
    params.portalOrigin ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://yetaf-weekly-monthly-report.vercel.app"
  ).replace(/\/$/, "");

  const reportTitle =
    warning.report_type === "monthly"
      ? "Monthly Progress Report"
      : "Weekly Performance Report";
  const empName =
    warning.employee_name || warning.employee_email?.split("@")[0] || "Team Member";
  const warningPortalUrl = `${origin}/warnings/${warning.id}`;
  const submitReportUrl = `${origin}/reports/new/${warning.report_type}`;

  let result: { ok: boolean; error?: string };

  if (warning.warning_level === "verbal_warning") {
    const text =
      `⚠️ <b>VERBAL WARNING (1st Offense) — YETAF HOLDING</b>\n\n` +
      `Dear <b>${escapeTelegramHtml(empName)}</b>,\n` +
      `Our records show you did <b>not submit</b> your required <b>${reportTitle}</b> for <b>${escapeTelegramHtml(
        warning.period_label
      )}</b> (${escapeTelegramHtml(warning.period_start)} to ${escapeTelegramHtml(
        warning.period_end
      )}).\n\n` +
      `Please treat this notice as an official <b>1st Verbal Warning</b>.\n` +
      `<i>Important: A 2nd missed report will automatically generate and send a Formal Written Warning Letter to your personnel record.</i>`;

    result = await sendTelegramMessage({
      botToken: settings.telegram_bot_token,
      chatId: warning.employee_telegram_chat_id,
      text,
      portalHttpsUrl: submitReportUrl,
      buttonText: "Submit Report Now",
    });
  } else {
    const docxBuffer = await buildDocxBufferForWarning(warning);
    const safeRef = (
      warning.letter_ref || `YH-WL-${warning.id.slice(0, 8).toUpperCase()}`
    ).replace(/[^A-Za-z0-9-_]/g, "");
    const caption =
      `📄 <b>OFFICIAL WRITTEN WARNING LETTER (${escapeTelegramHtml(
        safeRef
      )}) — YETAF HOLDING</b>\n\n` +
      `Dear <b>${escapeTelegramHtml(empName)}</b>,\n` +
      `Because this is your <b>Strike #${warning.strike_number}</b> missed submission (<b>${reportTitle}</b> · <b>${escapeTelegramHtml(
        warning.period_label
      )}</b>), the system has automatically prepared and issued the attached <b>Formal Written Warning Letter</b>.\n\n` +
      `Please open the attached Word document and acknowledge receipt in the portal.`;

    result = await sendTelegramDocument({
      botToken: settings.telegram_bot_token,
      chatId: warning.employee_telegram_chat_id,
      filename: `YETAF-Warning-Letter-${safeRef}.docx`,
      fileBuffer: docxBuffer,
      caption,
      portalHttpsUrl: warningPortalUrl,
      buttonText: "View & Acknowledge Letter",
    });
  }

  if (result.ok) {
    await sql`
      UPDATE disciplinary_warnings
      SET telegram_sent_at = now(),
          telegram_error = NULL
      WHERE id = ${warning.id};
    `;
    return { sent: true };
  }

  const errMsg = result.error || "Failed to send Telegram warning.";
  await sql`
    UPDATE disciplinary_warnings
    SET telegram_error = ${errMsg}
    WHERE id = ${warning.id};
  `;
  return { sent: false, error: errMsg };
}

export interface IssueWarningOutcome {
  issued: boolean;
  skippedReason?: "user_not_found" | "already_submitted" | "already_warned";
  warning?: DisciplinaryWarningRow;
  telegram?: { sent: boolean; error?: string };
}

export async function issueWarningForMissedReport(params: {
  userId: string;
  reportType: ReportType;
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  issuedBy?: string | null;
  triggerSource: WarningTriggerSource;
  portalOrigin?: string | null;
}): Promise<IssueWarningOutcome> {
  const userRows = await sql`
    SELECT id, full_name, email, department
    FROM users
    WHERE id = ${params.userId}
    LIMIT 1;
  `;
  if (userRows.length === 0) {
    return { issued: false, skippedReason: "user_not_found" };
  }
  const targetUser = userRows[0];

  // Skip if user already submitted/reviewed a report overlapping this period
  const submittedRows = await sql`
    SELECT id
    FROM reports
    WHERE user_id = ${params.userId}
      AND report_type = ${params.reportType}
      AND status IN ('submitted', 'reviewed')
      AND period_start <= ${params.periodEnd}::date
      AND period_end >= ${params.periodStart}::date
    LIMIT 1;
  `;
  if (submittedRows.length > 0) {
    return { issued: false, skippedReason: "already_submitted" };
  }

  // Skip if an active/acknowledged warning already exists for this exact period
  const duplicateRows = await sql`
    SELECT id
    FROM disciplinary_warnings
    WHERE user_id = ${params.userId}
      AND report_type = ${params.reportType}
      AND period_start = ${params.periodStart}::date
      AND period_end = ${params.periodEnd}::date
      AND status <> 'revoked'
    LIMIT 1;
  `;
  if (duplicateRows.length > 0) {
    const existing = await getWarningById(String(duplicateRows[0].id));
    return {
      issued: false,
      skippedReason: "already_warned",
      warning: existing || undefined,
    };
  }

  // Count prior active warnings to determine escalation level
  const priorWarnings = await sql`
    SELECT id, period_label, created_at
    FROM disciplinary_warnings
    WHERE user_id = ${params.userId}
      AND status <> 'revoked'
    ORDER BY created_at ASC;
  `;

  const strikeNumber = priorWarnings.length + 1;
  const warningLevel: WarningLevel =
    strikeNumber === 1 ? "verbal_warning" : "written_letter";

  let issuedByName: string | null = null;
  if (params.issuedBy) {
    const issuerRows = await sql`
      SELECT full_name FROM users WHERE id = ${params.issuedBy} LIMIT 1;
    `;
    issuedByName = issuerRows[0]?.full_name ? String(issuerRows[0].full_name) : null;
  }

  let letterRef: string | null = null;
  let letterSubject: string | null = null;
  let letterBody: string | null = null;

  if (warningLevel === "written_letter") {
    const ethYear = new Intl.DateTimeFormat("en-US", {
      timeZone: ETHIOPIA_TIMEZONE,
      year: "numeric",
    }).format(new Date());
    const randSuffix = crypto.randomBytes(2).toString("hex").toUpperCase();
    letterRef = `YH-WL-${ethYear}-${String(strikeNumber).padStart(2, "0")}-${randSuffix}`;

    const firstPrior = priorWarnings[0];
    const composed = composeWarningLetterContent({
      letterRef,
      issuedDateLabel: formatEthDateLabel(),
      employeeName:
        (targetUser.full_name as string) ||
        String(targetUser.email).split("@")[0] ||
        "Staff Member",
      employeeEmail: String(targetUser.email || ""),
      department: String(targetUser.department || "Operations"),
      reportType: params.reportType,
      periodLabel: params.periodLabel,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      strikeNumber,
      priorWarningDateLabel: firstPrior
        ? formatEthDateLabel(firstPrior.created_at)
        : null,
      priorWarningPeriodLabel: firstPrior
        ? String(firstPrior.period_label)
        : null,
      issuedByName,
    });
    letterSubject = composed.subject;
    letterBody = composed.body;
  } else {
    const reportTitle =
      params.reportType === "monthly"
        ? "Monthly Progress Report"
        : "Weekly Performance Report";
    letterSubject = `Verbal Warning (1st Offense) — Missed ${reportTitle} (${params.periodLabel})`;
    letterBody =
      `Official 1st Verbal Warning issued via Telegram notification for non-submission of ${reportTitle} (${params.periodLabel}, ${params.periodStart} to ${params.periodEnd}). ` +
      `A subsequent missed submission will automatically escalate to a Formal Written Warning Letter.`;
  }

  const inserted = await sql`
    INSERT INTO disciplinary_warnings (
      user_id, issued_by, report_type, period_start, period_end, period_label,
      strike_number, warning_level, letter_ref, letter_subject, letter_body,
      trigger_source, status
    )
    VALUES (
      ${params.userId},
      ${params.issuedBy ?? null},
      ${params.reportType},
      ${params.periodStart}::date,
      ${params.periodEnd}::date,
      ${params.periodLabel},
      ${strikeNumber},
      ${warningLevel},
      ${letterRef},
      ${letterSubject},
      ${letterBody},
      ${params.triggerSource},
      'active'
    )
    RETURNING id;
  `;

  const warningId = String(inserted[0].id);
  const telegram = await deliverWarningTelegram({
    warningId,
    portalOrigin: params.portalOrigin,
  });
  const saved = await getWarningById(warningId);

  return {
    issued: true,
    warning: saved || undefined,
    telegram,
  };
}

export interface EnforcementPeriodInput {
  reportType: ReportType;
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
}

export interface EnforcementSummary {
  skipped: boolean;
  skipReason?: string;
  checkedPeriods: string[];
  verbalIssued: number;
  lettersIssued: number;
  alreadyWarned: number;
  telegramSent: number;
  telegramFailed: number;
  issuedWarnings: DisciplinaryWarningRow[];
}

function getPreviousClosedPeriods(todayEthYmd: string): {
  lastWeek: EnforcementPeriodInput;
  lastMonth: EnforcementPeriodInput;
  ethDayOfMonth: number;
} {
  const currentWeekStart = getWeekBounds(todayEthYmd).start;
  const [wy, wm, wd] = currentWeekStart.split("-").map(Number);
  const prevMon = new Date(Date.UTC(wy, (wm || 1) - 1, (wd || 1) - 7));
  const prevSun = new Date(prevMon);
  prevSun.setUTCDate(prevMon.getUTCDate() + 6);

  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
      d.getUTCDate()
    ).padStart(2, "0")}`;
  const shortMonths = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const fullMonths = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const lwStart = fmt(prevMon);
  const lwEnd = fmt(prevSun);
  const lwLabel = `${shortMonths[prevMon.getUTCMonth()]} ${prevMon.getUTCDate()} – ${
    shortMonths[prevSun.getUTCMonth()]
  } ${prevSun.getUTCDate()}`;

  const [ty, tm, td] = todayEthYmd.split("-").map(Number);
  const prevMonthDt = new Date(Date.UTC(ty, (tm || 1) - 2, 1));
  const lmYm = `${prevMonthDt.getUTCFullYear()}-${String(
    prevMonthDt.getUTCMonth() + 1
  ).padStart(2, "0")}`;
  const lmBounds = getMonthBounds(lmYm);
  const lmLabel = `${fullMonths[prevMonthDt.getUTCMonth()]} ${prevMonthDt.getUTCFullYear()}`;

  return {
    lastWeek: {
      reportType: "weekly",
      periodStart: lwStart,
      periodEnd: lwEnd,
      periodLabel: lwLabel,
    },
    lastMonth: {
      reportType: "monthly",
      periodStart: lmBounds.start,
      periodEnd: lmBounds.end,
      periodLabel: lmLabel,
    },
    ethDayOfMonth: td || 1,
  };
}

export async function runComplianceEnforcement(params: {
  triggerSource: WarningTriggerSource;
  issuedBy?: string | null;
  portalOrigin?: string | null;
  targetPeriods?: EnforcementPeriodInput[];
}): Promise<EnforcementSummary> {
  const settings = await getPortalSettings();
  const windowStatus = evaluateReportingWindow(settings);

  let periodsToCheck: EnforcementPeriodInput[] = params.targetPeriods || [];

  if (params.triggerSource === "auto" && periodsToCheck.length === 0) {
    if (!settings.auto_warn_enabled) {
      return {
        skipped: true,
        skipReason: "Automatic disciplinary enforcement is disabled in settings.",
        checkedPeriods: [],
        verbalIssued: 0,
        lettersIssued: 0,
        alreadyWarned: 0,
        telegramSent: 0,
        telegramFailed: 0,
        issuedWarnings: [],
      };
    }

    if (settings.window_mode === "force_open" || windowStatus.isOpen) {
      return {
        skipped: true,
        skipReason: "Reporting window is currently open; waiting for close deadline.",
        checkedPeriods: [],
        verbalIssued: 0,
        lettersIssued: 0,
        alreadyWarned: 0,
        telegramSent: 0,
        telegramFailed: 0,
        issuedWarnings: [],
      };
    }

    const todayEthYmd = new Intl.DateTimeFormat("en-CA", {
      timeZone: ETHIOPIA_TIMEZONE,
    }).format(new Date());
    const prev = getPreviousClosedPeriods(todayEthYmd);
    periodsToCheck = [prev.lastWeek];
    if (prev.ethDayOfMonth >= 4) {
      periodsToCheck.push(prev.lastMonth);
    }
  }

  const employees = await sql`
    SELECT id
    FROM users
    WHERE role = 'employee'
    ORDER BY full_name ASC;
  `;

  let verbalIssued = 0;
  let lettersIssued = 0;
  let alreadyWarned = 0;
  let telegramSent = 0;
  let telegramFailed = 0;
  const issuedWarnings: DisciplinaryWarningRow[] = [];

  for (const period of periodsToCheck) {
    for (const emp of employees) {
      const outcome = await issueWarningForMissedReport({
        userId: String(emp.id),
        reportType: period.reportType,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        periodLabel: period.periodLabel,
        issuedBy: params.issuedBy ?? null,
        triggerSource: params.triggerSource,
        portalOrigin: params.portalOrigin,
      });

      if (!outcome.issued) {
        if (outcome.skippedReason === "already_warned") {
          alreadyWarned += 1;
        }
        continue;
      }

      if (outcome.warning) {
        issuedWarnings.push(outcome.warning);
        if (outcome.warning.warning_level === "verbal_warning") {
          verbalIssued += 1;
        } else {
          lettersIssued += 1;
        }
      }

      if (outcome.telegram?.sent) {
        telegramSent += 1;
      } else {
        telegramFailed += 1;
      }
    }
  }

  return {
    skipped: false,
    checkedPeriods: periodsToCheck.map((p) => `${p.reportType}:${p.periodLabel}`),
    verbalIssued,
    lettersIssued,
    alreadyWarned,
    telegramSent,
    telegramFailed,
    issuedWarnings,
  };
}

