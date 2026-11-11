import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getPortalSettings } from "@/lib/portalSettings";
import { evaluateReportingWindow, type WindowMode } from "@/lib/windowSchedule";
import { fetchTelegramBotInfo } from "@/lib/telegram";

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function maskToken(token: string | null): string | null {
  if (!token) return null;
  if (token.length <= 12) return "••••••••";
  return `${token.slice(0, 6)}••••••${token.slice(-4)}`;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getPortalSettings();
  const windowStatus = evaluateReportingWindow(settings);
  const isPrivileged = user.role === "admin" || user.role === "super_admin";

  return NextResponse.json({
    success: true,
    windowStatus,
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
      { error: "Forbidden: Admin privileges required." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const current = await getPortalSettings();

    const windowMode: WindowMode = body.window_mode ?? current.window_mode;
    if (!["scheduled", "force_open", "force_closed"].includes(windowMode)) {
      return NextResponse.json({ error: "Invalid window_mode." }, { status: 400 });
    }

    const openDay = Number(body.open_day ?? current.open_day);
    const closeDay = Number(body.close_day ?? current.close_day);
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

    const openTime = String(body.open_time ?? current.open_time).trim();
    const closeTime = String(body.close_time ?? current.close_time).trim();
    if (!TIME_RE.test(openTime) || !TIME_RE.test(closeTime)) {
      return NextResponse.json(
        { error: "Times must be valid 24-hour HH:MM strings." },
        { status: 400 }
      );
    }

    const dbRows = await sql`
      SELECT telegram_bot_token, telegram_bot_username
      FROM portal_settings WHERE id = 'default' LIMIT 1;
    `;
    let nextBotToken: string | null = dbRows[0]?.telegram_bot_token ?? null;
    let nextBotUsername: string | null = dbRows[0]?.telegram_bot_username ?? null;

    if (body.clear_telegram_token === true) {
      nextBotToken = null;
      nextBotUsername = null;
    } else if (typeof body.telegram_bot_token === "string" && body.telegram_bot_token.trim()) {
      const candidate = body.telegram_bot_token.trim();
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
      typeof body.telegram_bot_username === "string" &&
      body.telegram_bot_username.trim()
    ) {
      nextBotUsername = body.telegram_bot_username.trim().replace(/^@/, "");
    }

    await sql`
      INSERT INTO portal_settings (
        id, window_mode, open_day, open_time, close_day, close_time,
        timezone, telegram_bot_token, telegram_bot_username, updated_by, updated_at
      )
      VALUES (
        'default',
        ${windowMode},
        ${openDay},
        ${openTime},
        ${closeDay},
        ${closeTime},
        'Africa/Addis_Ababa',
        ${body.clear_telegram_token ? null : nextBotToken},
        ${nextBotUsername},
        ${user.id},
        now()
      )
      ON CONFLICT (id) DO UPDATE SET
        window_mode = EXCLUDED.window_mode,
        open_day = EXCLUDED.open_day,
        open_time = EXCLUDED.open_time,
        close_day = EXCLUDED.close_day,
        close_time = EXCLUDED.close_time,
        timezone = EXCLUDED.timezone,
        telegram_bot_token = EXCLUDED.telegram_bot_token,
        telegram_bot_username = EXCLUDED.telegram_bot_username,
        updated_by = EXCLUDED.updated_by,
        updated_at = now();
    `;

    const updated = await getPortalSettings();
    const windowStatus = evaluateReportingWindow(updated);

    return NextResponse.json({
      success: true,
      windowStatus,
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
