import { sql } from "./db";
import { getCurrentUser } from "./auth";
import {
  DEFAULT_WINDOW_CONFIG,
  evaluateReportingWindow,
  type ReportingWindowConfig,
  type ReportingWindowStatus,
  type WindowMode,
} from "./windowSchedule";

export interface LetterheadConfig {
  organizationName: string;
  divisionSubtitle: string;
  addressLine: string;
  contactLine: string;
  referencePrefix: string;
  footerNotice: string;
  signatoryTitle: string;
  logo_url: string | null;
}

export const DEFAULT_LETTERHEAD_CONFIG: LetterheadConfig = {
  organizationName: "YETAF HOLDING LIMITED",
  divisionSubtitle: "OFFICE OF DIRECTION & REPORT FOLLOW-UP CENTER",
  addressLine: "Addis Ababa, Ethiopia · Corporate Headquarters",
  contactLine: "Tel: +251 11 000 0000 · info@yetaf-holding.com · www.yetaf-holding.com",
  referencePrefix: "YH-DFC",
  footerNotice: "Confidential · Official Corporate Record · Yetaf Holding Limited",
  signatoryTitle: "Office of Direction & Executive Administration",
  logo_url: null,
};

export interface PortalSettingsRow extends ReportingWindowConfig {
  company_id: string | null;
  company_name: string | null;
  telegram_bot_token: string | null;
  telegram_bot_username: string | null;
  auto_warn_enabled: boolean;
  penalty_policy_verified: boolean;
  sla_response_days: number;
  system_name: string;
  letterhead_config: LetterheadConfig;
  erp_api_key: string | null;
  updated_at: string | null;
}

export function normalizeLetterheadConfig(raw: unknown): LetterheadConfig {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_LETTERHEAD_CONFIG };
  const obj = raw as Partial<LetterheadConfig>;
  return {
    organizationName:
      obj.organizationName?.trim() || DEFAULT_LETTERHEAD_CONFIG.organizationName,
    divisionSubtitle:
      obj.divisionSubtitle?.trim() || DEFAULT_LETTERHEAD_CONFIG.divisionSubtitle,
    addressLine: obj.addressLine?.trim() || DEFAULT_LETTERHEAD_CONFIG.addressLine,
    contactLine: obj.contactLine?.trim() || DEFAULT_LETTERHEAD_CONFIG.contactLine,
    referencePrefix:
      obj.referencePrefix?.trim() || DEFAULT_LETTERHEAD_CONFIG.referencePrefix,
    footerNotice: obj.footerNotice?.trim() || DEFAULT_LETTERHEAD_CONFIG.footerNotice,
    signatoryTitle:
      obj.signatoryTitle?.trim() || DEFAULT_LETTERHEAD_CONFIG.signatoryTitle,
    logo_url:
      typeof obj.logo_url === "string" && obj.logo_url.trim()
        ? obj.logo_url.trim()
        : DEFAULT_LETTERHEAD_CONFIG.logo_url,
  };
}

/** Load settings scoped to a specific company from company_settings. */
export async function getCompanySettings(
  companyId: string
): Promise<PortalSettingsRow> {
  try {
    const companyRows = await sql`
      SELECT name, logo_url FROM companies WHERE id = ${companyId} LIMIT 1;
    `;
    const companyName = companyRows.length > 0
      ? (companyRows[0].name as string)
      : null;
    const companyLogo = companyRows.length > 0 && typeof companyRows[0].logo_url === "string"
      ? (companyRows[0].logo_url as string)
      : null;

    const rows = await sql`
      SELECT window_mode, open_day, open_time, close_day, close_time, timezone,
             telegram_bot_token, telegram_bot_username, auto_warn_enabled,
             penalty_policy_verified, sla_response_days, system_name,
             letterhead_config, erp_api_key, updated_at
      FROM company_settings
      WHERE company_id = ${companyId}
      LIMIT 1;
    `;

    const r = rows.length > 0 ? rows[0] : null;
    if (!r) {
      return {
        ...DEFAULT_WINDOW_CONFIG,
        company_id: companyId,
        company_name: companyName,
        telegram_bot_token: process.env.TELEGRAM_BOT_TOKEN || null,
        telegram_bot_username: process.env.TELEGRAM_BOT_USERNAME || null,
        auto_warn_enabled: false,
        penalty_policy_verified: false,
        sla_response_days: 3,
        system_name: "Directive Follow-up System",
        letterhead_config: { ...DEFAULT_LETTERHEAD_CONFIG, organizationName: companyName || DEFAULT_LETTERHEAD_CONFIG.organizationName, logo_url: companyLogo },
        erp_api_key: process.env.ERP_API_KEY || null,
        updated_at: null,
      };
    }

    const letterheadConfig = normalizeLetterheadConfig(r.letterhead_config);

    return {
      window_mode: (r.window_mode as WindowMode) || DEFAULT_WINDOW_CONFIG.window_mode,
      open_day:
        typeof r.open_day === "number" ? r.open_day : DEFAULT_WINDOW_CONFIG.open_day,
      open_time: r.open_time || DEFAULT_WINDOW_CONFIG.open_time,
      close_day:
        typeof r.close_day === "number" ? r.close_day : DEFAULT_WINDOW_CONFIG.close_day,
      close_time: r.close_time || DEFAULT_WINDOW_CONFIG.close_time,
      timezone: r.timezone || DEFAULT_WINDOW_CONFIG.timezone,
      company_id: companyId,
      company_name: companyName,
      telegram_bot_token:
        r.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN || null,
      telegram_bot_username:
        r.telegram_bot_username || process.env.TELEGRAM_BOT_USERNAME || null,
      auto_warn_enabled:
        typeof r.auto_warn_enabled === "boolean" ? r.auto_warn_enabled : false,
      penalty_policy_verified:
        typeof r.penalty_policy_verified === "boolean"
          ? r.penalty_policy_verified
          : false,
      sla_response_days:
        typeof r.sla_response_days === "number" && r.sla_response_days >= 1
          ? r.sla_response_days
          : 3,
      system_name:
        typeof r.system_name === "string" && r.system_name.trim()
          ? r.system_name.trim()
          : "Directive Follow-up System",
      letterhead_config: {
        ...letterheadConfig,
        organizationName: companyName || letterheadConfig.organizationName,
        logo_url: letterheadConfig.logo_url || companyLogo,
      },
      erp_api_key: r.erp_api_key || process.env.ERP_API_KEY || null,
      updated_at: r.updated_at
        ? typeof r.updated_at === "string"
          ? r.updated_at
          : r.updated_at.toISOString()
        : null,
    };
  } catch (err) {
    console.error("Failed to load company_settings, using defaults:", err);
    return {
      ...DEFAULT_WINDOW_CONFIG,
      company_id: companyId,
      company_name: null,
      telegram_bot_token: process.env.TELEGRAM_BOT_TOKEN || null,
      telegram_bot_username: process.env.TELEGRAM_BOT_USERNAME || null,
      auto_warn_enabled: false,
      penalty_policy_verified: false,
      sla_response_days: 3,
      system_name: "Directive Follow-up System",
      letterhead_config: { ...DEFAULT_LETTERHEAD_CONFIG },
      erp_api_key: process.env.ERP_API_KEY || null,
      updated_at: null,
    };
  }
}

/** Load settings for the currently authenticated user's company. */
export async function getPortalSettings(): Promise<PortalSettingsRow> {
  const user = await getCurrentUser();
  if (!user || !user.company_id) {
    return {
      ...DEFAULT_WINDOW_CONFIG,
      company_id: null,
      company_name: null,
      telegram_bot_token: process.env.TELEGRAM_BOT_TOKEN || null,
      telegram_bot_username: process.env.TELEGRAM_BOT_USERNAME || null,
      auto_warn_enabled: false,
      penalty_policy_verified: false,
      sla_response_days: 3,
      system_name: "Directive Follow-up System",
      letterhead_config: { ...DEFAULT_LETTERHEAD_CONFIG },
      erp_api_key: process.env.ERP_API_KEY || null,
      updated_at: null,
    };
  }
  return getCompanySettings(user.company_id);
}

export async function getReportingWindowStatus(
  now: Date = new Date()
): Promise<ReportingWindowStatus> {
  const settings = await getPortalSettings();
  return evaluateReportingWindow(settings, now);
}
