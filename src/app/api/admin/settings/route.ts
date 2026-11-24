import crypto from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import {
  getPortalSettings,
  getCompanySettings,
  normalizeLetterheadConfig,
} from "@/lib/portalSettings";
import { evaluateReportingWindow, type WindowMode } from "@/lib/windowSchedule";
import { fetchTelegramBotInfo } from "@/lib/telegram";

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function maskToken(token: string | null): string | null {
  if (!token) return null;
  if (token.length <= 12) return "••••••••";
  return `${token.slice(0, 6)}••••••${token.slice(-4)}`;
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isPrivileged = user.role === "admin" || user.role === "super_admin";

  // Super admin may target a different company via ?company_id query param.
  const searchParams = (request as NextRequest).nextUrl.searchParams;
  const targetCompanyId = isPrivileged ? searchParams.get("company_id") : null;
  const companyId = targetCompanyId ?? user.company_id ?? null;

  const settings = companyId ? await getCompanySettings(companyId) : await getPortalSettings();
  const windowStatus = evaluateReportingWindow(settings);

  return NextResponse.json({
    success: true,
    companyId: settings.company_id,
    companyName: settings.company_name,
    windowStatus,
    autoWarnEnabled: settings.auto_warn_enabled,
    penaltyPolicyVerified: settings.penalty_policy_verified,
    slaResponseDays: settings.sla_response_days,
    systemName: settings.system_name,
    letterheadConfig: settings.letterhead_config,
    erp: {
      configured: !!settings.erp_api_key,
      maskedKey: isPrivileged ? maskToken(settings.erp_api_key) : null,
    },
    telegram: {
      configured: !!settings.telegram_bot_token,
      botUsername: settings.telegram_bot_username,
      maskedToken: isPrivileged ? maskToken(settings.telegram_bot_token) : null,
      envOverride: !!process.env.TELEGRAM_BOT_TOKEN,
    },
  });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "admin" && user.role !== "super_admin") {
    return NextResponse.json(
      { error: "Forbidden: Admin or Direction privileges required." },
      { status: 403 }
    );
  }

  const isSuperAdmin = user.role === "super_admin";

  try {
    // Determine target company: explicit company_id for super_admin, else user's company.
    const bodyPreview = await request.json();
  const targetCompanyId = isSuperAdmin
    ? (bodyPreview.company_id || user.company_id || null)
    : (user.company_id || null);

  if (!targetCompanyId) {
    return NextResponse.json(
      { error: "No company context available." },
      { status: 400 }
    );
  }

  const current = await getCompanySettings(targetCompanyId);

  const windowMode: WindowMode =
    bodyPreview.window_mode ?? current.window_mode;
  if (!["scheduled", "force_open", "force_closed"].includes(windowMode)) {
    return NextResponse.json({ error: "Invalid window_mode." }, { status: 400 });
  }

  const openDay = Number(bodyPreview.open_day ?? current.open_day);
  const closeDay = Number(bodyPreview.close_day ?? current.close_day);
  if (
    !Number.isInteger(openDay) ||
    openDay < 0 ||
    openDay > 6 ||
    !Number.isInteger(closeDay) ||
    closeDay < 0 ||
    closeDay > 6
  ) {
    return NextResponse.json(
      { error: "open_day and close_day must be integers between 0 and 6." },
      { status: 400 }
    );
  }

  const openTime = String(bodyPreview.open_time ?? current.open_time).trim();
  const closeTime = String(bodyPreview.close_time ?? current.close_time).trim();
  if (!TIME_RE.test(openTime) || !TIME_RE.test(closeTime)) {
    return NextResponse.json(
      { error: "Times must be valid 24-hour HH:MM strings." },
      { status: 400 }
    );
  }

  const slaResponseDays =
    bodyPreview.sla_response_days !== undefined
      ? Number(bodyPreview.sla_response_days)
      : current.sla_response_days;
  if (!Number.isInteger(slaResponseDays) || slaResponseDays < 1 || slaResponseDays > 60) {
    return NextResponse.json(
      { error: "SLA response countdown must be an integer between 1 and 60 days." },
      { status: 400 }
    );
  }

  const systemName =
    typeof bodyPreview.system_name === "string" && bodyPreview.system_name.trim()
      ? bodyPreview.system_name.trim().slice(0, 80)
      : current.system_name;

    const letterheadConfig = bodyPreview.letterhead_config
      ? normalizeLetterheadConfig({
          ...current.letterhead_config,
          ...bodyPreview.letterhead_config,
        })
      : current.letterhead_config;

    const dbRows = await sql`
      SELECT telegram_bot_token, telegram_bot_username, erp_api_key
      FROM company_settings WHERE company_id = ${targetCompanyId} LIMIT 1;
    `;
    let nextBotToken: string | null = dbRows[0]?.telegram_bot_token ?? null;
    let nextBotUsername: string | null = dbRows[0]?.telegram_bot_username ?? null;
    let nextErpKey: string | null = dbRows[0]?.erp_api_key ?? null;
    let newlyGeneratedErpKey: string | null = null;

    if (bodyPreview.generate_erp_api_key === true) {
      newlyGeneratedErpKey = `yh_erp_${crypto.randomBytes(20).toString("hex")}`;
      nextErpKey = newlyGeneratedErpKey;
    } else if (bodyPreview.revoke_erp_api_key === true) {
      nextErpKey = null;
    }

    if (bodyPreview.clear_telegram_token === true) {
      nextBotToken = null;
      nextBotUsername = null;
    } else if (
      typeof bodyPreview.telegram_bot_token === "string" &&
      bodyPreview.telegram_bot_token.trim()
    ) {
      const candidate = bodyPreview.telegram_bot_token.trim();
      const info = await fetchTelegramBotInfo(candidate);
      if (!info.ok) {
        return NextResponse.json(
          { error: `Telegram bot token verification failed: ${info.error}` },
          { status: 400 }
        );
      }
      nextBotToken = candidate;
      nextBotUsername = info.username || null;
    } else if (
      typeof bodyPreview.telegram_bot_username === "string" &&
      bodyPreview.telegram_bot_username.trim()
    ) {
      nextBotUsername = bodyPreview.telegram_bot_username.trim().replace(/^@/, "");
    }

    const autoWarnEnabled =
      typeof bodyPreview.auto_warn_enabled === "boolean"
        ? bodyPreview.auto_warn_enabled
        : current.auto_warn_enabled;

    await sql`
      INSERT INTO company_settings (
        company_id, window_mode, open_day, open_time, close_day, close_time,
        timezone, telegram_bot_token, telegram_bot_username, auto_warn_enabled,
        penalty_policy_verified, sla_response_days, system_name, letterhead_config,
        erp_api_key, updated_by, updated_at
      )
      VALUES (
        ${targetCompanyId},
        ${windowMode},
        ${openDay},
        ${openTime},
        ${closeDay},
        ${closeTime},
        'Africa/Addis_Ababa',
        ${bodyPreview.clear_telegram_token ? null : nextBotToken},
        ${nextBotUsername},
        ${autoWarnEnabled},
        ${typeof bodyPreview.penalty_policy_verified === "boolean" ? bodyPreview.penalty_policy_verified : current.penalty_policy_verified},
        ${slaResponseDays},
        ${systemName},
        ${JSON.stringify(letterheadConfig)}::jsonb,
        ${nextErpKey},
        ${user.id},
        now()
      )
      ON CONFLICT (company_id) DO UPDATE SET
        window_mode = EXCLUDED.window_mode,
        open_day = EXCLUDED.open_day,
        open_time = EXCLUDED.open_time,
        close_day = EXCLUDED.close_day,
        close_time = EXCLUDED.close_time,
        timezone = EXCLUDED.timezone,
        telegram_bot_token = EXCLUDED.telegram_bot_token,
        telegram_bot_username = EXCLUDED.telegram_bot_username,
        auto_warn_enabled = EXCLUDED.auto_warn_enabled,
        penalty_policy_verified = EXCLUDED.penalty_policy_verified,
        sla_response_days = EXCLUDED.sla_response_days,
        system_name = EXCLUDED.system_name,
        letterhead_config = EXCLUDED.letterhead_config,
        erp_api_key = EXCLUDED.erp_api_key,
        updated_by = EXCLUDED.updated_by,
        updated_at = now();
    `;

    const updated = await getCompanySettings(targetCompanyId);
    const windowStatus = evaluateReportingWindow(updated);

    return NextResponse.json({
      success: true,
      companyId: updated.company_id,
      companyName: updated.company_name,
      windowStatus,
      autoWarnEnabled: updated.auto_warn_enabled,
      penaltyPolicyVerified: updated.penalty_policy_verified,
      slaResponseDays: updated.sla_response_days,
      systemName: updated.system_name,
      letterheadConfig: updated.letterhead_config,
      erp: {
        configured: !!updated.erp_api_key,
        maskedKey: maskToken(updated.erp_api_key),
        plaintextKeyOnce: newlyGeneratedErpKey,
      },
      telegram: {
        configured: !!updated.telegram_bot_token,
        botUsername: updated.telegram_bot_username,
        maskedToken: maskToken(updated.telegram_bot_token),
        envOverride: !!process.env.TELEGRAM_BOT_TOKEN,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
