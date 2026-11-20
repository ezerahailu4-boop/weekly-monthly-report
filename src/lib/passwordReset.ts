import { randomBytes } from "crypto";
import { sql } from "@/lib/db";
import { getPortalSettings } from "@/lib/portalSettings";
import { sendTelegramMessage } from "@/lib/telegram";

/**
 * Generate a cryptographically secure reset token.
 */
export function generateResetToken(): string {
  const bytes = randomBytes(32);
  return bytes.toString("hex");
}

/**
 * Create a password reset request. Never reveals whether the email exists
 * in the system — always returns success to avoid user enumeration.
 */
export async function createPasswordResetRequest(input: {
  email: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<{ requestId: string; token: string; emailExists: boolean }> {
  const emailLower = (input.email || "").trim().toLowerCase();

  // Check if email exists (for internal tracking only; never leaked in response)
  const existing = await sql`
    SELECT id FROM users WHERE LOWER(email) = ${emailLower} LIMIT 1;
  `;
  const emailExists = existing.length > 0;
  const userId = emailExists ? existing[0].id : null;

  const token = generateResetToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const [request] = await sql`
    INSERT INTO password_reset_requests (
      email, token, requested_by_user_id, ip_address, user_agent, expires_at
    )
    VALUES (
      ${emailLower},
      ${token},
      ${userId ?? null},
      ${input.ipAddress ?? null},
      ${input.userAgent ?? null},
      ${expiresAt.toISOString()}
    )
    RETURNING id;
  `;

  const requestId = String(request.id);

  // Notify admins via Telegram so they can review the request
  try {
    await notifyAdminsOfResetRequest({
      requestId,
      email: emailLower,
      emailExists,
    });
  } catch (err) {
    console.error("Failed to notify admins of reset request:", err);
  }

  return { requestId, token, emailExists };
}

/**
 * Verify a reset token is valid (pending, not expired).
 */
export async function verifyResetToken(token: string): Promise<{
  valid: boolean;
  requestId?: string;
  email?: string;
  expiresAt?: string;
  error?: string;
}> {
  const rows = await sql`
    SELECT id, email, status, expires_at
    FROM password_reset_requests
    WHERE token = ${token}
    LIMIT 1;
  `;

  if (rows.length === 0) {
    return { valid: false, error: "Invalid reset token." };
  }

  const request = rows[0];
  const now = new Date();

  if (request.status !== "pending") {
    return {
      valid: false,
      error: `Reset request already ${request.status as string}.`,
    };
  }

  const expiresAtVal = request.expires_at;
  const expiresDate =
    expiresAtVal && typeof expiresAtVal === "object"
      ? new Date((expiresAtVal as { toISOString: () => string }).toISOString())
      : null;

  if (expiresDate && expiresDate < now) {
    await sql`
      UPDATE password_reset_requests
      SET status = 'expired'
      WHERE id = ${request.id};
    `;
    return { valid: false, error: "Reset token has expired." };
  }

  return {
    valid: true,
    requestId: String(request.id),
    email: request.email as string,
    expiresAt: expiresDate ? expiresDate.toISOString() : undefined,
  };
}

/**
 * Fulfill a reset request: set the new password hash and mark fulfilled.
 * Returns the user id whose password was changed.
 */
export async function fulfillResetRequest(input: {
  token: string;
  newPasswordHash: string;
  adminId?: string | null;
  adminNotes?: string | null;
}): Promise<{ userId: string; email: string }> {
  const rows = await sql`
    SELECT id, email, requested_by_user_id, status, expires_at
    FROM password_reset_requests
    WHERE token = ${input.token}
    LIMIT 1;
  `;

  if (rows.length === 0) {
    throw new Error("Invalid reset token.");
  }

  const request = rows[0];
  const now = new Date();

  if (request.status !== "pending") {
    throw new Error(
      `Reset request already ${request.status as string}.`
    );
  }

  const expiresAtVal = request.expires_at;
  const expiresDate =
    expiresAtVal && typeof expiresAtVal === "object"
      ? new Date((expiresAtVal as { toISOString: () => string }).toISOString())
      : null;

  if (expiresDate && expiresDate < now) {
    await sql`
      UPDATE password_reset_requests
      SET status = 'expired'
      WHERE id = ${request.id};
    `;
    throw new Error("Reset token has expired.");
  }

  const targetUserId = request.requested_by_user_id;
  if (!targetUserId) {
    throw new Error("No user associated with this reset request.");
  }

  // Update user password
  await sql`
    UPDATE users
    SET password_hash = ${input.newPasswordHash}
    WHERE id = ${targetUserId};
  `;

  // Invalidate all sessions for this user (force re-login)
  await sql`
    DELETE FROM sessions
    WHERE user_id = ${targetUserId};
  `;

  // Mark request fulfilled
  await sql`
    UPDATE password_reset_requests
    SET status = 'fulfilled',
        admin_action_by = ${input.adminId ?? null},
        admin_action_at = now(),
        admin_notes = ${input.adminNotes ?? null},
        new_password_hash = ${input.newPasswordHash}
    WHERE id = ${request.id};
  `;

  const userEmailRow = await sql`
    SELECT email FROM users WHERE id = ${targetUserId} LIMIT 1;
  `;

  return {
    userId: targetUserId as string,
    email: (userEmailRow[0]?.email as string) || request.email,
  };
}

/**
 * Admin approves or rejects a pending reset request.
 */
export async function adminReviewResetRequest(input: {
  requestId: string;
  adminId: string;
  action: "approve" | "reject";
  notes?: string | null;
}): Promise<{ status: string; email: string; userId?: string }> {
  const rows = await sql`
    SELECT id, email, status, requested_by_user_id, expires_at
    FROM password_reset_requests
    WHERE id = ${input.requestId}
    LIMIT 1;
  `;

  if (rows.length === 0) {
    throw new Error("Reset request not found.");
  }

  const request = rows[0];
  const now = new Date();

  if (request.status !== "pending") {
    throw new Error(
      `Reset request already ${request.status as string}.`
    );
  }

  const expiresAtVal = request.expires_at;
  const expiresDate =
    expiresAtVal && typeof expiresAtVal === "object"
      ? new Date((expiresAtVal as { toISOString: () => string }).toISOString())
      : null;

  if (expiresDate && expiresDate < now) {
    await sql`
      UPDATE password_reset_requests
      SET status = 'expired'
      WHERE id = ${request.id};
    `;
    throw new Error("Reset token has expired.");
  }

  const newStatus = input.action === "approve" ? "approved" : "rejected";

  await sql`
    UPDATE password_reset_requests
    SET status = ${newStatus},
        admin_action_by = ${input.adminId},
        admin_action_at = now(),
        admin_notes = ${input.notes ?? null}
    WHERE id = ${request.id};
  `;

  return {
    status: newStatus,
    email: request.email as string,
    userId: (request.requested_by_user_id as string) || undefined,
  };
}

type ResetRequestRow = {
  id: unknown;
  email: unknown;
  status: unknown;
  created_at: unknown;
  expires_at: unknown;
  requested_by_user_id: unknown;
  admin_action_by: unknown;
  admin_action_at: unknown;
  admin_notes: unknown;
};

/**
 * List reset requests (admin view).
 */
export async function listResetRequests({
  limit = 50,
  offset = 0,
  status,
}: {
  limit?: number;
  offset?: number;
  status?: string;
}): Promise<Array<{
  id: string;
  email: string;
  status: string;
  created_at: string;
  expires_at: string | null;
  requested_by_user_id: string | null;
  admin_action_by: string | null;
  admin_action_at: string | null;
  admin_notes: string | null;
}>> {
  const query = sql`
    SELECT id, email, status, created_at, expires_at,
           requested_by_user_id, admin_action_by, admin_action_at, admin_notes
    FROM password_reset_requests
    ${status ? sql`WHERE status = ${status}` : sql``}
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const rows = await query as ResetRequestRow[];

  return rows.map((r) => {
    const createdAtVal = r.created_at;
    const createdAtStr =
      typeof createdAtVal === "string"
        ? createdAtVal
        : createdAtVal && typeof createdAtVal === "object"
          ? new Date((createdAtVal as { toISOString: () => string }).toISOString()).toISOString()
          : "";

    const expiresAtVal = r.expires_at;
    const expiresAtStr =
      expiresAtVal && typeof expiresAtVal === "object"
        ? new Date((expiresAtVal as { toISOString: () => string }).toISOString()).toISOString()
        : null;

    const adminActionAtVal = r.admin_action_at;
    const adminActionAtStr =
      adminActionAtVal && typeof adminActionAtVal === "object"
        ? new Date((adminActionAtVal as { toISOString: () => string }).toISOString()).toISOString()
        : null;

    return {
      id: String(r.id),
      email: String(r.email),
      status: String(r.status),
      created_at: createdAtStr,
      expires_at: expiresAtStr,
      requested_by_user_id: r.requested_by_user_id
        ? String(r.requested_by_user_id)
        : null,
      admin_action_by: r.admin_action_by ? String(r.admin_action_by) : null,
      admin_action_at: adminActionAtStr,
      admin_notes: r.admin_notes ? String(r.admin_notes) : null,
    };
  });
}

/**
 * Notify all admins with Telegram linked about a new reset request.
 */
async function notifyAdminsOfResetRequest(input: {
  requestId: string;
  email: string;
  emailExists: boolean;
}): Promise<void> {
  const settings = await getPortalSettings();
  if (!settings.telegram_bot_token) return;

  const admins = await sql`
    SELECT id, full_name, email, telegram_chat_id FROM users
    WHERE role IN ('admin', 'super_admin') AND telegram_chat_id IS NOT NULL;
  `;
  if (admins.length === 0) return;

  const existsLabel = input.emailExists ? "registered user" : "unrecognized email";
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/admin?tab=password-resets`;

  const text =
    `🔐 <b>Password Reset Requested — YETAF HOLDING</b>\n\n` +
    `<b>Email:</b> ${input.email}\n` +
    `<b>Status:</b> ${existsLabel}\n` +
    `<b>Request ID:</b> <code>${input.requestId}</code>\n\n` +
    `Review and approve/reject in the admin console:\n${resetUrl}`;

  await Promise.all(
    admins.map((a: Record<string, string>) =>
      sendTelegramMessage({
        botToken: settings.telegram_bot_token!,
        chatId: a.telegram_chat_id,
        text,
        portalHttpsUrl: process.env.NEXT_PUBLIC_APP_URL
          ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
          : undefined,
        buttonText: "Review Reset Requests",
      })
    )
  );
}

/**
 * Notify a user that their password has been reset (if Telegram linked).
 */
export async function notifyUserPasswordReset(input: {
  userId: string;
  email: string;
}): Promise<void> {
  const settings = await getPortalSettings();
  if (!settings.telegram_bot_token) return;

  const rows = await sql`
    SELECT full_name, telegram_chat_id FROM users WHERE id = ${input.userId} LIMIT 1;
  `;
  if (rows.length === 0 || !rows[0].telegram_chat_id) return;

  const text =
    `🔑 <b>Password Reset — YETAF HOLDING</b>\n\n` +
    `Hello, your account password has been reset by an administrator.\n` +
    `<b>Email:</b> ${input.email}\n\n` +
    `Please sign in with your new credentials and consider updating your password in Profile.` +
    `\nIf you did not request this, contact the administrator immediately.`;

  await sendTelegramMessage({
    botToken: settings.telegram_bot_token!,
    chatId: rows[0].telegram_chat_id,
    text,
    portalHttpsUrl: process.env.NEXT_PUBLIC_APP_URL
      ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
      : undefined,
    buttonText: "Sign In",
  });
}
