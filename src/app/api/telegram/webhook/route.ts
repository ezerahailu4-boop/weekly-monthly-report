import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getCompanySettingsForUser, getPortalSettings } from "@/lib/portalSettings";
import { processTelegramStartMessage } from "@/lib/telegram";

export async function POST(request: Request) {
  try {
    const secretEnv = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (secretEnv) {
      const headerSecret = request.headers.get("x-telegram-bot-api-secret-token");
      if (headerSecret !== secretEnv) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const update = await request.json();
    const messageText = String(update?.message?.text || "").trim();
    let botToken: string | null = null;

    if (messageText.startsWith("/start")) {
      const tokenPart = messageText.split(/\s+/)[1]?.trim();
      if (tokenPart) {
        const userRows = await sql`
          SELECT id FROM users WHERE telegram_link_token = ${tokenPart} LIMIT 1;
        `;
        if (userRows.length > 0) {
          const userSettings = await getCompanySettingsForUser(String(userRows[0].id));
          botToken = userSettings.telegram_bot_token;
        }
      }
    }

    if (!botToken) {
      const settings = await getPortalSettings();
      botToken = settings.telegram_bot_token;
    }

    if (!botToken) {
      return NextResponse.json({ ok: true });
    }

    if (update?.message) {
      await processTelegramStartMessage(update.message, botToken);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Telegram webhook error:", err);
    return NextResponse.json({ ok: true });
  }
}

