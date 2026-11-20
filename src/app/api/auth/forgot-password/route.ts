import { NextResponse } from "next/server";
import { createPasswordResetRequest } from "@/lib/passwordReset";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = (body.email || "").trim();

    if (!email) {
      return NextResponse.json(
        { error: "Email address is required." },
        { status: 400 }
      );
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      request.headers.get("x-real-ip") ??
      null;
    const userAgent = request.headers.get("user-agent") ?? null;

    // Always return success to avoid user enumeration
    await createPasswordResetRequest({ email, ipAddress: ip, userAgent });

    return NextResponse.json({
      success: true,
      message:
        "If an account exists for this email, an administrator has been notified and will review your request.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Forgot password error:", message);
    // Still return success to avoid leaking info
    return NextResponse.json({
      success: true,
      message:
        "If an account exists for this email, an administrator has been notified and will review your request.",
    });
  }
}
