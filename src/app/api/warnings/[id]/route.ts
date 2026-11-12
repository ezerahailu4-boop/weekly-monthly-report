import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { deliverWarningTelegram, getWarningById } from "@/lib/warnings";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const warning = await getWarningById(id);
  if (!warning) {
    return NextResponse.json({ error: "Warning not found." }, { status: 404 });
  }

  const isPrivileged = user.role === "admin" || user.role === "super_admin";
  if (!isPrivileged && warning.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ success: true, warning });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const warning = await getWarningById(id);
  if (!warning) {
    return NextResponse.json({ error: "Warning not found." }, { status: 404 });
  }

  const isPrivileged = user.role === "admin" || user.role === "super_admin";
  const isOwner = warning.user_id === user.id;

  if (!isPrivileged && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const action = String(body.action || "");

    if (action === "acknowledge") {
      if (!isOwner && !isPrivileged) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (warning.status === "revoked") {
        return NextResponse.json(
          { error: "Cannot acknowledge a revoked warning." },
          { status: 400 }
        );
      }

      await sql`
        UPDATE disciplinary_warnings
        SET status = 'acknowledged',
            acknowledged_at = COALESCE(acknowledged_at, now())
        WHERE id = ${id};
      `;

      const updated = await getWarningById(id);
      return NextResponse.json({ success: true, warning: updated });
    }

    if (!isPrivileged) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (action === "resend_telegram") {
      const origin =
        process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
      const telegram = await deliverWarningTelegram({
        warningId: id,
        portalOrigin: origin,
      });
      const updated = await getWarningById(id);
      return NextResponse.json({
        success: telegram.sent,
        warning: updated,
        telegram,
        error: telegram.error,
      });
    }

    if (action === "revoke") {
      await sql`
        UPDATE disciplinary_warnings
        SET status = 'revoked'
        WHERE id = ${id};
      `;
      const updated = await getWarningById(id);
      return NextResponse.json({ success: true, warning: updated });
    }

    if (action === "restore") {
      await sql`
        UPDATE disciplinary_warnings
        SET status = CASE WHEN acknowledged_at IS NOT NULL THEN 'acknowledged' ELSE 'active' END
        WHERE id = ${id};
      `;
      const updated = await getWarningById(id);
      return NextResponse.json({ success: true, warning: updated });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

