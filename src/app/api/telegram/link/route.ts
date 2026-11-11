import crypto from "crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getPortalSettings } from "@/lib/portalSettings";
import {
  escapeTelegramHtml,
  sendTelegramMessage,
  syncTelegramConnections,
} from "@/lib/telegram";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [userRows, settings] = await Promise.all([
    sql`
      SELECT telegram_chat_id, telegram_username, telegram_link_token, telegram_linked_at
      FROM users WHERE id = ${user.id} LIMIT 1;
    `,
    getPortalSettings(),
  ]);

  const u = userRows[0];
  const token = u?.telegram_link_token || null;
  const botUsername = settings.telegram_bot_username || null;
  const deepLink =
    token && botUsername ? `https://t.me/${botUsername}?start=${token}` : null;

  return NextResponse.json({
    success: true,
    connected: !!u?.telegram_chat_id,
    telegram_chat_id: u?.telegram_chat_id ?? null,
    telegram_username: u?.telegram_username ?? null,
    telegram_linked_at: u?.telegram_linked_at ?? null,
    botConfigured: !!settings.telegram_bot_token,
    botUsername,
    linkToken: token,
    deepLink,
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const action = body.action as string;
    const settings = await getPortalSettings();

    if (action === "generate_link") {
      if (!settings.telegram_bot_token || !settings.telegram_bot_username) {
        return NextResponse.json(
          {
            error:
              "Telegram bot is not configured yet. Ask an Administrator to configure the Telegram Bot Token first.",
          },
          { status: 400 }
        );
      }

      const token = `yh_${crypto.randomBytes(12).toString("hex")}`;
      await sql`
        UPDATE users
        SET telegram_link_token = ${token}
        WHERE id = ${user.id};
      `;

      const deepLink = `https://t.me/${settings.telegram_bot_username}?start=${token}`;
      return NextResponse.json({
        success: true,
        linkToken: token,
        deepLink,
        botUsername: settings.telegram_bot_username,
      });
    }

    if (action === "sync") {
      const syncResult = await syncTelegramConnections();
      if (!syncResult.ok) {
        return NextResponse.json(
          { error: syncResult.error || "Sync failed." },
          { status: 400 }
        );
      }

      const rows = await sql`
        SELECT telegram_chat_id, telegram_username, telegram_linked_at
        FROM users WHERE id = ${user.id} LIMIT 1;
      `;
      const updated = rows[0];

      return NextResponse.json({
        success: true,
        connected: !!updated?.telegram_chat_id,
        telegram_chat_id: updated?.telegram_chat_id ?? null,
        telegram_username: updated?.telegram_username ?? null,
        linkedNow: syncResult.linkedUserIds.includes(user.id),
      });
    }

    if (action === "save_chat_id") {
      const targetUserId =
        typeof body.userId === "string" &&
        (user.role === "admin" || user.role === "super_admin")
          ? body.userId
          : user.id;

      const chatId = typeof body.chat_id === "string" ? body.chat_id.trim() : "";
      if (!chatId) {
        await sql`
          UPDATE users
          SET telegram_chat_id = NULL,
              telegram_username = NULL,
              telegram_linked_at = NULL
          WHERE id = ${targetUserId};
        `;
        return NextResponse.json({ success: true, connected: false });
      }

      if (!/^-?\d+$/.test(chatId)) {
        return NextResponse.json(
          { error: "Telegram Chat ID must be numeric (e.g. 123456789)." },
          { status: 400 }
        );
      }

      await sql`
        UPDATE users
        SET telegram_chat_id = ${chatId},
            telegram_linked_at = now()
        WHERE id = ${targetUserId};
      `;

      let testDelivered = false;
      let testError: string | undefined;
      if (body.sendTest && settings.telegram_bot_token) {
        const res = await sendTelegramMessage({
          botToken: settings.telegram_bot_token,
          chatId,
          text:
            `✅ <b>Test Notification — YETAF HOLDING</b>\n\n` +
            `Your Telegram account is linked for <b>${escapeTelegramHtml(
              user.full_name
            )}</b>.`,
        });
        testDelivered = res.ok;
        testError = res.error;
      }

      return NextResponse.json({
        success: true,
        connected: true,
        telegram_chat_id: chatId,
        testDelivered,
        testError,
      });
    }

    if (action === "test") {
      if (!settings.telegram_bot_token) {
        return NextResponse.json(
          { error: "Telegram bot token is not configured." },
          { status: 400 }
        );
      }

      const targetUserId =
        typeof body.userId === "string" &&
        (user.role === "admin" || user.role === "super_admin")
          ? body.userId
          : user.id;

      const rows = await sql`
        SELECT full_name, telegram_chat_id
        FROM users WHERE id = ${targetUserId} LIMIT 1;
      `;
      const target = rows[0];
      if (!target?.telegram_chat_id) {
        return NextResponse.json(
          { error: "No Telegram Chat ID linked to this account yet." },
          { status: 400 }
        );
      }

      const sendRes = await sendTelegramMessage({
        botToken: settings.telegram_bot_token,
        chatId: target.telegram_chat_id,
        text:
          `🔔 <b>Test Alert — YETAF HOLDING Portal</b>\n\n` +
          `Hello <b>${escapeTelegramHtml(
            target.full_name
          )}</b>, Telegram task notifications are working properly!`,
      });

      if (!sendRes.ok) {
        return NextResponse.json(
          { error: sendRes.error || "Failed to send test message." },
          { status: 400 }
        );
      }

      return NextResponse.json({ success: true });
    }

    if (action === "disconnect") {
      await sql`
        UPDATE users
        SET telegram_chat_id = NULL,
            telegram_username = NULL,
            telegram_linked_at = NULL,
            telegram_link_token = NULL
        WHERE id = ${user.id};
      `;
      return NextResponse.json({ success: true, connected: false });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

