import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { runComplianceEnforcement } from "@/lib/warnings";

async function handleCron(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const isVercelCronHeader = request.headers.get("x-vercel-cron") === "1";

  let authorized = false;
  if (cronSecret) {
    authorized = authHeader === `Bearer ${cronSecret}`;
  } else if (isVercelCronHeader) {
    authorized = true;
  }

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

