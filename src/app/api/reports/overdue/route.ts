import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getPortalSettings } from "@/lib/portalSettings";
import { escapeTelegramHtml, sendTelegramMessage } from "@/lib/telegram";
import { getWeekBounds, getMonthBounds } from "@/lib/compliancePeriods";
import { ETHIOPIA_TIMEZONE } from "@/lib/windowSchedule";

function getTodayEthYmd() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ETHIOPIA_TIMEZONE }).format(new Date());
}

function getCurrentPeriods(todayEthYmd: string) {
  const weekBounds = getWeekBounds(todayEthYmd);
  const ym = todayEthYmd.slice(0, 7);
  const monthBounds = getMonthBounds(ym);
  return { weekBounds, monthBounds };
}

export interface OverdueStaffMember {
  id: string;
  full_name: string;
  email: string;
  department: string | null;
  telegram_chat_id: string | null;
  missingWeekly: boolean;
  missingMonthly: boolean;
}

/** GET /api/reports/overdue — returns staff missing current week/month reports */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin" && user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const todayEthYmd = getTodayEthYmd();
  const { weekBounds, monthBounds } = getCurrentPeriods(todayEthYmd);

  const [employees, submittedReports] = await Promise.all([
    sql`
      SELECT id, full_name, email, department, telegram_chat_id
      FROM users
      WHERE role = 'employee'
      ORDER BY full_name ASC;
    `,
    sql`
      SELECT DISTINCT user_id, report_type
      FROM reports
      WHERE status IN ('submitted', 'reviewed')
        AND (
          (report_type = 'weekly'
            AND period_start <= ${weekBounds.end}::date
            AND period_end >= ${weekBounds.start}::date)
          OR
          (report_type = 'monthly'
            AND period_start <= ${monthBounds.end}::date
            AND period_end >= ${monthBounds.start}::date)
        );
    `,
  ]);

  const submittedSet = new Set(
    submittedReports.map((r) => `${r.user_id}:${r.report_type}`)
  );

  const overdue: OverdueStaffMember[] = employees
    .map((e) => ({
      id: String(e.id),
      full_name: String(e.full_name || e.email),
      email: String(e.email),
      department: e.department ? String(e.department) : null,
      telegram_chat_id: e.telegram_chat_id ? String(e.telegram_chat_id) : null,
      missingWeekly: !submittedSet.has(`${e.id}:weekly`),
      missingMonthly: !submittedSet.has(`${e.id}:monthly`),
    }))
    .filter((e) => e.missingWeekly || e.missingMonthly);

  return NextResponse.json({
    overdue,
    periods: { week: weekBounds, month: monthBounds },
    total: overdue.length,
    missingWeeklyCount: overdue.filter((e) => e.missingWeekly).length,
    missingMonthlyCount: overdue.filter((e) => e.missingMonthly).length,
    telegramLinkedCount: overdue.filter((e) => e.telegram_chat_id).length,
  });
}

/** POST /api/reports/overdue — send bulk Telegram reminders to all overdue staff */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin" && user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const settings = await getPortalSettings();
  if (!settings.telegram_bot_token) {
    return NextResponse.json(
      { error: "Telegram bot token is not configured." },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const targets: { userId: string; reportType: "weekly" | "monthly" }[] | null =
    body.targets ?? null;

  const todayEthYmd = getTodayEthYmd();
  const { weekBounds, monthBounds } = getCurrentPeriods(todayEthYmd);
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ||
    request.headers.get("origin") ||
    "https://yetaf-weekly-monthly-report.vercel.app";

  let toNotify: { userId: string; reportType: "weekly" | "monthly" }[];

  if (targets && targets.length > 0) {
    toNotify = targets;
  } else {
    const [employees, submittedReports] = await Promise.all([
      sql`
        SELECT id, telegram_chat_id
        FROM users
        WHERE role = 'employee' AND telegram_chat_id IS NOT NULL;
      `,
      sql`
        SELECT DISTINCT user_id, report_type
        FROM reports
        WHERE status IN ('submitted', 'reviewed')
          AND (
            (report_type = 'weekly'
              AND period_start <= ${weekBounds.end}::date
              AND period_end >= ${weekBounds.start}::date)
            OR
            (report_type = 'monthly'
              AND period_start <= ${monthBounds.end}::date
              AND period_end >= ${monthBounds.start}::date)
          );
      `,
    ]);

    const submittedSet = new Set(
      submittedReports.map((r) => `${r.user_id}:${r.report_type}`)
    );

    toNotify = [];
    for (const e of employees) {
      if (!submittedSet.has(`${e.id}:weekly`))
        toNotify.push({ userId: String(e.id), reportType: "weekly" });
      if (!submittedSet.has(`${e.id}:monthly`))
        toNotify.push({ userId: String(e.id), reportType: "monthly" });
    }
  }

  if (toNotify.length === 0) {
    return NextResponse.json({ success: true, sent: 0, failed: 0, skipped: 0 });
  }

  const uniqueIds = [...new Set(toNotify.map((t) => t.userId))];
  const userRows = await sql`
    SELECT id, full_name, telegram_chat_id
    FROM users
    WHERE id = ANY(${uniqueIds}::uuid[]);
  `;
  const userMap = new Map(userRows.map((u) => [String(u.id), u]));

  let sent = 0, failed = 0, skipped = 0;

  await Promise.all(
    toNotify.map(async ({ userId, reportType }) => {
      const u = userMap.get(userId);
      if (!u?.telegram_chat_id) { skipped++; return; }

      const typeTitle =
        reportType === "monthly" ? "Monthly Progress Report" : "Weekly Performance Report";
      const bounds = reportType === "weekly" ? weekBounds : monthBounds;
      const submitUrl = `${origin.replace(/\/$/, "")}/reports/new/${reportType}`;

      const text =
        `⏰ <b>Report Submission Reminder — YETAF HOLDING</b>\n\n` +
        `Hello <b>${escapeTelegramHtml(u.full_name)}</b>,\n` +
        `Your <b>${typeTitle}</b> for <b>${escapeTelegramHtml(bounds.start)}</b> → <b>${escapeTelegramHtml(bounds.end)}</b> has not been submitted yet.\n\n` +
        `Please log in to the portal and submit your report before the deadline.`;

      const res = await sendTelegramMessage({
        botToken: settings.telegram_bot_token!,
        chatId: String(u.telegram_chat_id),
        text,
        portalHttpsUrl: submitUrl,
        buttonText: "Submit Report Now",
      });

      if (res.ok) sent++; else failed++;
    })
  );

  return NextResponse.json({ success: true, sent, failed, skipped });
}
