import { sql } from "./db";
import { getPortalSettings } from "./portalSettings";

export function escapeTelegramHtml(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function fetchTelegramBotInfo(botToken: string): Promise<{
  ok: boolean;
  username?: string;
  firstName?: string;
  error?: string;
}> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`, {
      cache: "no-store",
    });
    const json = await res.json();
    if (!json.ok || !json.result) {
      return { ok: false, error: json.description || "Invalid Telegram bot token." };
    }
    return {
      ok: true,
      username: json.result.username,
      firstName: json.result.first_name,
    };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to reach Telegram API",
    };
  }
}

export async function sendTelegramMessage(params: {
  botToken: string;
  chatId: string;
  text: string;
  portalHttpsUrl?: string | null;
  buttonText?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const payload: Record<string, unknown> = {
      chat_id: params.chatId.trim(),
      text: params.text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    };

    if (params.portalHttpsUrl && params.portalHttpsUrl.startsWith("https://")) {
      payload.reply_markup = {
        inline_keyboard: [
          [
            {
              text: params.buttonText || "View & Complete Task in Portal",
              url: params.portalHttpsUrl,
            },
          ],
        ],
      };
    }

    const res = await fetch(
      `https://api.telegram.org/bot${params.botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const json = await res.json();
    if (!json.ok) {
      return { ok: false, error: json.description || "Telegram sendMessage failed." };
    }
    return { ok: true };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error sending Telegram message",
    };
  }
}

export async function sendTelegramDocument(params: {
  botToken: string;
  chatId: string;
  filename: string;
  fileBuffer: Buffer;
  mimeType?: string;
  caption?: string;
  portalHttpsUrl?: string | null;
  buttonText?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const form = new FormData();
    form.append("chat_id", params.chatId.trim());
    if (params.caption) {
      form.append("caption", params.caption);
      form.append("parse_mode", "HTML");
    }
    if (params.portalHttpsUrl && params.portalHttpsUrl.startsWith("https://")) {
      form.append(
        "reply_markup",
        JSON.stringify({
          inline_keyboard: [
            [
              {
                text: params.buttonText || "Open Official Letter in Portal",
                url: params.portalHttpsUrl,
              },
            ],
          ],
        })
      );
    }

    const blob = new Blob([new Uint8Array(params.fileBuffer)], {
      type:
        params.mimeType ||
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    form.append("document", blob, params.filename);

    const res = await fetch(
      `https://api.telegram.org/bot${params.botToken}/sendDocument`,
      {
        method: "POST",
        body: form,
      }
    );

    const json = await res.json();
    if (!json.ok) {
      return { ok: false, error: json.description || "Telegram sendDocument failed." };
    }
    return { ok: true };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error sending Telegram document",
    };
  }
}

interface TelegramIncomingMessage {
  text?: string;
  chat?: { id?: number | string; username?: string; first_name?: string };
  from?: { id?: number | string; username?: string; first_name?: string };
}

/** Match `/start <telegram_link_token>` and bind user's Telegram chat_id. */
export async function processTelegramStartMessage(
  msg: TelegramIncomingMessage,
  botToken: string
): Promise<{ matched: boolean; userId?: string }> {
  const text = (msg.text || "").trim();
  const chatId = msg.chat?.id ?? msg.from?.id;
  if (!chatId || !text.startsWith("/start")) {
    return { matched: false };
  }

  const parts = text.split(/\s+/);
  const linkToken = parts[1]?.trim();
  if (!linkToken) {
    return { matched: false };
  }

  const rows = await sql`
    SELECT id, full_name
    FROM users
    WHERE telegram_link_token = ${linkToken}
    LIMIT 1;
  `;

  if (rows.length === 0) {
    return { matched: false };
  }

  const targetUser = rows[0];
  const tgUsername = msg.from?.username || msg.chat?.username || null;
  const chatIdStr = String(chatId);

  await sql`
    UPDATE users
    SET telegram_chat_id = ${chatIdStr},
        telegram_username = ${tgUsername},
        telegram_linked_at = now(),
        telegram_link_token = NULL
    WHERE id = ${targetUser.id};
  `;

  await sendTelegramMessage({
    botToken,
    chatId: chatIdStr,
    text:
      `✅ <b>Telegram Connected — YETAF HOLDING Portal</b>\n\n` +
      `Hello <b>${escapeTelegramHtml(targetUser.full_name)}</b>, your account is now linked.\n` +
      `You will receive instant notifications here whenever management assigns you a new task.`,
  });

  return { matched: true, userId: targetUser.id };
}

/** Poll getUpdates (useful for localhost / environments without HTTPS webhooks). */
export async function syncTelegramConnections(): Promise<{
  ok: boolean;
  linkedCount: number;
  linkedUserIds: string[];
  error?: string;
}> {
  const settings = await getPortalSettings();
  if (!settings.telegram_bot_token) {
    return {
      ok: false,
      linkedCount: 0,
      linkedUserIds: [],
      error: "Telegram bot token is not configured.",
    };
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${settings.telegram_bot_token}/getUpdates?limit=100`,
      { cache: "no-store" }
    );
    const json = await res.json();
    if (!json.ok || !Array.isArray(json.result)) {
      return {
        ok: false,
        linkedCount: 0,
        linkedUserIds: [],
        error: json.description || "Failed to fetch Telegram updates.",
      };
    }

    const linkedUserIds: string[] = [];
    for (const update of json.result) {
      if (update?.message) {
        const result = await processTelegramStartMessage(
          update.message,
          settings.telegram_bot_token
        );
        if (result.matched && result.userId) {
          linkedUserIds.push(result.userId);
        }
      }
    }

    return {
      ok: true,
      linkedCount: linkedUserIds.length,
      linkedUserIds,
    };
  } catch (err: unknown) {
    return {
      ok: false,
      linkedCount: 0,
      linkedUserIds: [],
      error: err instanceof Error ? err.message : "Failed to sync Telegram updates.",
    };
  }
}

export async function notifyAdminsReportSubmitted(params: {
  reportId: string;
  reportType: string;
  authorName: string;
  authorDepartment: string;
  periodStart: string;
  periodEnd: string;
  portalOrigin?: string | null;
}): Promise<void> {
  const settings = await getPortalSettings();
  if (!settings.telegram_bot_token) return;

  const admins = await sql`
    SELECT telegram_chat_id FROM users
    WHERE role IN ('admin', 'super_admin') AND telegram_chat_id IS NOT NULL;
  `;
  if (admins.length === 0) return;

  const reportUrl = params.portalOrigin
    ? `${params.portalOrigin.replace(/\/$/, "")}/reports/${params.reportId}`
    : null;

  const text =
    `📥 <b>New Report Submitted — YETAF HOLDING</b>\n\n` +
    `<b>Author:</b> ${escapeTelegramHtml(params.authorName)}\n` +
    `<b>Department:</b> ${escapeTelegramHtml(params.authorDepartment)}\n` +
    `<b>Type:</b> ${params.reportType === "weekly" ? "Weekly Performance" : "Monthly Progress"}\n` +
    `<b>Period:</b> ${escapeTelegramHtml(params.periodStart)} → ${escapeTelegramHtml(params.periodEnd)}\n\n` +
    `Open the portal to review and sign off.`;

  await Promise.all(
    admins.map((a: Record<string, string>) =>
      sendTelegramMessage({
        botToken: settings.telegram_bot_token!,
        chatId: a.telegram_chat_id,
        text,
        portalHttpsUrl: reportUrl,
        buttonText: "Review Report",
      })
    )
  );
}

export async function notifyAuthorReportReviewed(params: {
  reportId: string;
  reportType: string;
  reviewerName: string;
  reviewNotes?: string | null;
  portalOrigin?: string | null;
  authorUserId: string;
}): Promise<void> {
  const settings = await getPortalSettings();
  if (!settings.telegram_bot_token) return;

  const rows = await sql`
    SELECT telegram_chat_id, full_name FROM users WHERE id = ${params.authorUserId} LIMIT 1;
  `;
  if (rows.length === 0 || !rows[0].telegram_chat_id) return;

  const reportUrl = params.portalOrigin
    ? `${params.portalOrigin.replace(/\/$/, "")}/reports/${params.reportId}`
    : null;

  const notesText = params.reviewNotes
    ? `\n\n<b>Feedback:</b>\n${escapeTelegramHtml(params.reviewNotes)}`
    : "";

  const text =
    `✅ <b>Report Reviewed — YETAF HOLDING</b>\n\n` +
    `Your ${params.reportType === "weekly" ? "Weekly Performance" : "Monthly Progress"} report has been reviewed and signed off by <b>${escapeTelegramHtml(params.reviewerName)}</b>.` +
    notesText;

  await sendTelegramMessage({
    botToken: settings.telegram_bot_token,
    chatId: rows[0].telegram_chat_id,
    text,
    portalHttpsUrl: reportUrl,
    buttonText: "View Report & Feedback",
  });
}

const PRIORITY_BADGE: Record<string, string> = {
  urgent: "🔴 URGENT",
  high: "🟠 HIGH",
  medium: "🔵 MEDIUM",
  low: "⚪ LOW",
};

export async function notifyTaskAssigneeViaTelegram(params: {
  taskId: string;
  portalOrigin?: string | null;
}): Promise<{ sent: boolean; error?: string }> {
  const settings = await getPortalSettings();

  const rows = await sql`
    SELECT t.id, t.title, t.description, t.priority,
           to_char(t.due_date, 'YYYY-MM-DD') as due_date,
           u.id as assignee_id, u.full_name as assignee_name, u.telegram_chat_id,
           ab.full_name as assigned_by_name
    FROM tasks t
    JOIN users u ON t.assigned_to = u.id
    LEFT JOIN users ab ON t.assigned_by = ab.id
    WHERE t.id = ${params.taskId}
    LIMIT 1;
  `;

  if (rows.length === 0) {
    return { sent: false, error: "Task not found." };
  }

  const row = rows[0];

  if (!settings.telegram_bot_token) {
    const msg = "Telegram bot token not configured yet by Admin.";
    await sql`UPDATE tasks SET telegram_error = ${msg} WHERE id = ${params.taskId};`;
    return { sent: false, error: msg };
  }

  if (!row.telegram_chat_id) {
    const msg = "Assignee has not linked their Telegram account yet.";
    await sql`UPDATE tasks SET telegram_error = ${msg} WHERE id = ${params.taskId};`;
    return { sent: false, error: msg };
  }

  const priorityLabel = PRIORITY_BADGE[row.priority] || "🔵 MEDIUM";
  const dueText = row.due_date ? `\n<b>Due Date:</b> ${escapeTelegramHtml(row.due_date)}` : "";
  const descText = row.description
    ? `\n\n<b>Details:</b>\n${escapeTelegramHtml(row.description)}`
    : "";
  const portalTasksUrl = params.portalOrigin
    ? `${params.portalOrigin.replace(/\/$/, "")}/tasks`
    : null;
  const portalHint = portalTasksUrl
    ? `\n\nOpen your Tasks page to mark it completed:\n${escapeTelegramHtml(portalTasksUrl)}`
    : `\n\nOpen the YETAF HOLDING Portal (/tasks) to mark it completed.`;

  const text =
    `📋 <b>New Task Assigned — YETAF HOLDING</b>\n\n` +
    `<b>Task:</b> ${escapeTelegramHtml(row.title)}\n` +
    `<b>Priority:</b> ${priorityLabel}\n` +
    `<b>Assigned By:</b> ${escapeTelegramHtml(row.assigned_by_name || "Management")}` +
    dueText +
    descText +
    portalHint;

  const sendResult = await sendTelegramMessage({
    botToken: settings.telegram_bot_token,
    chatId: row.telegram_chat_id,
    text,
    portalHttpsUrl: portalTasksUrl,
  });

  if (sendResult.ok) {
    await sql`
      UPDATE tasks
      SET telegram_notified_at = now(),
          telegram_error = NULL
      WHERE id = ${params.taskId};
    `;
    return { sent: true };
  } else {
    const errMsg = sendResult.error || "Telegram delivery failed.";
    await sql`
      UPDATE tasks
      SET telegram_error = ${errMsg}
      WHERE id = ${params.taskId};
    `;
    return { sent: false, error: errMsg };
  }
}

