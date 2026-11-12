import { sql } from "./db";
import {
  DEFAULT_WINDOW_CONFIG,
  evaluateReportingWindow,
  type ReportingWindowConfig,
  type ReportingWindowStatus,
  type WindowMode,
} from "./windowSchedule";

export interface PortalSettingsRow extends ReportingWindowConfig {
  telegram_bot_token: string | null;
  telegram_bot_username: string | null;
  auto_warn_enabled: boolean;
  updated_at: string | null;
}

export async function getPortalSettings(): Promise<PortalSettingsRow> {
  try {
    const rows = await sql`
      SELECT window_mode, open_day, open_time, close_day, close_time, timezone,
             telegram_bot_token, telegram_bot_username, auto_warn_enabled, updated_at
      FROM portal_settings
      WHERE id = 'default'
      LIMIT 1;
    `;

    if (rows.length === 0) {
      return {
        ...DEFAULT_WINDOW_CONFIG,
        telegram_bot_token: process.env.TELEGRAM_BOT_TOKEN || null,
        telegram_bot_username: process.env.TELEGRAM_BOT_USERNAME || null,
        auto_warn_enabled: true,
        updated_at: null,
      };
    }

    const r = rows[0];
    return {
      window_mode: (r.window_mode as WindowMode) || DEFAULT_WINDOW_CONFIG.window_mode,
      open_day: typeof r.open_day === "number" ? r.open_day : DEFAULT_WINDOW_CONFIG.open_day,
      open_time: r.open_time || DEFAULT_WINDOW_CONFIG.open_time,
      close_day: typeof r.close_day === "number" ? r.close_day : DEFAULT_WINDOW_CONFIG.close_day,
      close_time: r.close_time || DEFAULT_WINDOW_CONFIG.close_time,
      timezone: r.timezone || DEFAULT_WINDOW_CONFIG.timezone,
      telegram_bot_token: r.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN || null,
      telegram_bot_username: r.telegram_bot_username || process.env.TELEGRAM_BOT_USERNAME || null,
      auto_warn_enabled:
        typeof r.auto_warn_enabled === "boolean" ? r.auto_warn_enabled : true,
      updated_at: r.updated_at
        ? typeof r.updated_at === "string"
          ? r.updated_at
          : r.updated_at.toISOString()
        : null,
    };
  } catch (err) {
    console.error("Failed to load portal_settings, using defaults:", err);
    return {
      ...DEFAULT_WINDOW_CONFIG,
      telegram_bot_token: process.env.TELEGRAM_BOT_TOKEN || null,
      telegram_bot_username: process.env.TELEGRAM_BOT_USERNAME || null,
      auto_warn_enabled: true,
      updated_at: null,
    };
  }
}

export async function getReportingWindowStatus(
  now: Date = new Date()
): Promise<ReportingWindowStatus> {
  const settings = await getPortalSettings();
  return evaluateReportingWindow(settings, now);
}

