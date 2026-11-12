import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getWarningsList,
  issueWarningForMissedReport,
  runComplianceEnforcement,
  type EnforcementPeriodInput,
} from "@/lib/warnings";
import type { ReportType } from "@/types/report";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope");
  const isPrivileged = user.role === "admin" || user.role === "super_admin";

  const warnings = await getWarningsList(
    isPrivileged && scope !== "mine" ? null : user.id
  );

  return NextResponse.json({ success: true, warnings });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "admin" && user.role !== "super_admin") {
    return NextResponse.json(
      { error: "Forbidden: Admin or CEO privileges required." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const portalOrigin =
      process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

    if (body.action === "enforce_period") {
      const periods = Array.isArray(body.periods)
        ? (body.periods as EnforcementPeriodInput[])
        : [];
      if (periods.length === 0) {
        return NextResponse.json(
          { error: "At least one target reporting period is required." },
          { status: 400 }
        );
      }

      const summary = await runComplianceEnforcement({
        triggerSource: "manual",
        issuedBy: user.id,
        portalOrigin,
        targetPeriods: periods,
      });

      return NextResponse.json({ success: true, summary });
    }

    const userId = String(body.userId || "").trim();
    const reportType = body.reportType as ReportType;
    const periodStart = String(body.periodStart || "").trim();
    const periodEnd = String(body.periodEnd || "").trim();
    const periodLabel = String(body.periodLabel || "").trim();

    if (
      !userId ||
      (reportType !== "weekly" && reportType !== "monthly") ||
      !periodStart ||
      !periodEnd ||
      !periodLabel
    ) {
      return NextResponse.json(
        { error: "userId, reportType, periodStart, periodEnd, and periodLabel are required." },
        { status: 400 }
      );
    }

    const outcome = await issueWarningForMissedReport({
      userId,
      reportType,
      periodStart,
      periodEnd,
      periodLabel,
      issuedBy: user.id,
      triggerSource: "manual",
      portalOrigin,
    });

    if (!outcome.issued) {
      const reasonMsg =
        outcome.skippedReason === "already_submitted"
          ? "Staff member has already submitted a report for this period."
          : outcome.skippedReason === "already_warned"
          ? "An active warning has already been issued for this period."
          : "User not found.";
      return NextResponse.json(
        {
          error: reasonMsg,
          skippedReason: outcome.skippedReason,
          warning: outcome.warning ?? null,
        },
        { status: outcome.skippedReason === "user_not_found" ? 404 : 409 }
      );
    }

    return NextResponse.json({
      success: true,
      warning: outcome.warning,
      telegram: outcome.telegram,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

