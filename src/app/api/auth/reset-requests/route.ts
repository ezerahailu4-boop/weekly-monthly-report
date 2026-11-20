import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { adminReviewResetRequest, listResetRequests } from "@/lib/passwordReset";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const requests = await listResetRequests({ limit, offset, status });

    return NextResponse.json({ requests });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("List reset requests error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const body = await request.json();
    const { requestId, action, notes } = body;

    if (!requestId || !action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "requestId and action (approve|reject) are required." },
        { status: 400 }
      );
    }

    const result = await adminReviewResetRequest({
      requestId,
      adminId: user.id,
      action: action as "approve" | "reject",
      notes: notes ?? null,
    });

    return NextResponse.json({
      success: true,
      status: result.status,
      email: result.email,
      message: `Reset request ${action}d.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Review reset request error:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
