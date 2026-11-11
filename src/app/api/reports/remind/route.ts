import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getPortalSettings } from "@/lib/portalSettings";
import { escapeTelegramHtml, sendTelegramMessage } from "@/lib/telegram";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "admin" && user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { userId, reportType, periodLabel } = await request.json();
    if (!userId || !reportType) {
      return NextResponse.json(
        { error: "userId and reportType are required." },
        { status: 400 }
      );
    }

    const [settings, rows] = await Promise.all([
      getPortalSettings(),
      sql`
        SELECT id, full_name, telegram_chat_id
        FROM users
        WHERE id = ${userId}
        LIMIT 1;
      `,
    ]);

    if (rows.length === 0) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const target = rows[0];
    if (!settings.telegram_bot_token) {
      return NextResponse.json(
        { error: "Telegram bot token is not configured in Admin Settings." },
        { status: 400 }
      );
    }

    if (!target.telegram_chat_id) {
      return NextResponse.json(
        { error: `${target.full_name} has not linked their Telegram account yet.` },
        { status: 400 }
      );
    }

    const typeTitle = reportType === "monthly" ? "Monthly Progress Report" : "Weekly Performance Report";
    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const targetUrl = `${origin.replace(/\/$/, "")}/reports/new/${
      reportType === "monthly" ? "monthly" : "weekly"
    }`;

    const text =
      `⏰ <b>Report Submission Reminder — YETAF HOLDING</b>\n\n` +
      `Hello <b>${escapeTelegramHtml(target.full_name)}</b>,\n` +
      `Management noticed your <b>${typeTitle}</b>${
        periodLabel ? ` for <b>${escapeTelegramHtml(periodLabel)}</b>` : ""
      } has not been submitted yet.\n\n` +
      `Please log in to the YETAF HOLDING Portal to complete and submit your report.`;

    const res = await sendTelegramMessage({
      botToken: settings.telegram_bot_token,
      chatId: target.telegram_chat_id,
      text,
      portalHttpsUrl: targetUrl,
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: res.error || "Failed to deliver Telegram reminder." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Telegram reminder sent to ${target.full_name}.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

