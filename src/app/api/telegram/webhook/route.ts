import { NextResponse } from "next/server";
import { getPortalSettings } from "@/lib/portalSettings";
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

    const settings = await getPortalSettings();
    if (!settings.telegram_bot_token) {
      return NextResponse.json({ ok: true });
    }

    const update = await request.json();
    if (update?.message) {
      await processTelegramStartMessage(update.message, settings.telegram_bot_token);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Telegram webhook error:", err);
    return NextResponse.json({ ok: true });
  }
}

