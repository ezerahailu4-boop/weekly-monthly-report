import { NextResponse } from "next/server";
import { verifyResetToken, fulfillResetRequest, notifyUserPasswordReset } from "@/lib/passwordReset";
import { hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Reset token is required." },
        { status: 400 }
      );
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    // Verify token
    const verification = await verifyResetToken(token);
    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.error || "Invalid or expired reset token." },
        { status: 400 }
      );
    }

    // Hash the new password
    const newPasswordHash = await hashPassword(password);

    // Fulfill the reset request
    const result = await fulfillResetRequest({
      token,
      newPasswordHash,
      adminId: null, // self-service reset via valid token
      adminNotes: "Self-service password reset via valid token.",
    });

    // Notify user if Telegram linked
    try {
      await notifyUserPasswordReset({
        userId: result.userId,
        email: result.email,
      });
    } catch {
      // Non-fatal
    }

    return NextResponse.json({
      success: true,
      message: "Your password has been reset successfully. You can now sign in.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Reset password error:", message);
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token is required." }, { status: 400 });
  }

  const verification = await verifyResetToken(token);
  if (!verification.valid) {
    return NextResponse.json(
      { valid: false, error: verification.error || "Invalid or expired token." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    valid: true,
    email: verification.email,
    expiresAt: verification.expiresAt,
  });
}
