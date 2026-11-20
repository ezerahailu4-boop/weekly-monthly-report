import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { runComplianceEnforcement } from "@/lib/warnings";
import { safeTimingCompare } from "@/lib/safeCompare";

async function handleCron(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();

  // Fail closed: if CRON_SECRET is not configured, refuse all cron executions
  if (!cronSecret) {
    return NextResponse.json(
      { error: "Cron execution disabled: CRON_SECRET environment variable is required." },
      { status: 503 }
    );
  }

  const authHeader = request.headers.get("authorization") || "";
  let authorized = false;

  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (safeTimingCompare(token, cronSecret)) {
      authorized = true;
    }
  }

  // Also permit authenticated admin / super_admin session for manual execution from the Admin console
  if (!authorized) {
    const user = await getCurrentUser();
    if (user && (user.role === "admin" || user.role === "super_admin")) {
      authorized = true;
    }
  }

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const portalOrigin =
      process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const summary = await runComplianceEnforcement({
      triggerSource: "auto",
      portalOrigin,
    });

    return NextResponse.json({ success: true, summary });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Enforcement failed";
    console.error("Automatic enforcement error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}

