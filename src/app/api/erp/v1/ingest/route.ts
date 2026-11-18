import crypto from "crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getPortalSettings } from "@/lib/portalSettings";
import { summarizeDirections } from "@/lib/directiveSummarizer";

async function authorizeErpRequest(request: Request): Promise<{ ok: boolean; userId: string | null }> {
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    const settings = await getPortalSettings();
    if (settings.erp_api_key && token === settings.erp_api_key) {
      return { ok: true, userId: null };
    }
  }
  const user = await getCurrentUser();
  if (user && (user.role === "admin" || user.role === "super_admin")) {
    return { ok: true, userId: user.id };
  }
  return { ok: false, userId: null };
}

/**
 * POST /api/erp/v1/ingest
 * Accepts ERP-originated directives or action plans in standardized REST JSON format.
 */
export async function POST(request: Request) {
  const auth = await authorizeErpRequest(request);
  if (!auth.ok) {
    return NextResponse.json(
      { error: "Unauthorized: Provide a valid ERP Bearer API key or Admin session." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const entity = body.entity === "action_plan" ? "action_plan" : "directive";
    const settings = await getPortalSettings();
    const prefix = settings.letterhead_config.referencePrefix || "YH-DFC";
    const year = new Date().getUTCFullYear();

    if (entity === "directive") {
      const title = String(body.title || "").trim();
      const directions = Array.isArray(body.directions) ? body.directions : [];
      if (!title || directions.length === 0) {
        return NextResponse.json(
          { error: "ERP directive payload requires 'title' and non-empty 'directions' array." },
          { status: 400 }
        );
      }

      const synth = await summarizeDirections({
        title,
        department: body.department,
        priority: body.priority,
        dueDate: body.due_date || null,
        directions,
      });

      const refCode =
        typeof body.reference_code === "string" && body.reference_code.trim()
          ? body.reference_code.trim()
          : `${prefix}-ERP-${year}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;

      const rows = await sql`
        INSERT INTO directives (
          reference_code, title, department, priority, directions, executive_summary,
          entry_mode, status, due_date, sla_days, created_by
        )
        VALUES (
          ${refCode},
          ${title},
          ${String(body.department || "All Departments")},
          ${["low", "medium", "high", "urgent"].includes(body.priority) ? body.priority : "medium"},
          ${JSON.stringify(directions)}::jsonb,
          ${body.executive_summary || synth.summary},
          'form',
          'open',
          ${body.due_date || null},
          ${Number(body.sla_days) || settings.sla_response_days},
          ${auth.userId}
        )
        RETURNING id, reference_code, title, status, created_at;
      `;

      return NextResponse.json({
        success: true,
        entity: "directive",
        record: rows[0],
      });
    }

    // Ingest action plan by author_email
    const authorEmail = String(body.author_email || "").trim().toLowerCase();
    const userRows = authorEmail
      ? await sql`SELECT id, department FROM users WHERE lower(email) = ${authorEmail} LIMIT 1;`
      : [];
    const ownerId = userRows[0]?.id || auth.userId;
    if (!ownerId) {
      return NextResponse.json(
        { error: "Valid 'author_email' matching a registered user is required." },
        { status: 400 }
      );
    }

    const refCode =
      typeof body.reference_code === "string" && body.reference_code.trim()
        ? body.reference_code.trim()
        : `${prefix}-ERP-PLN-${year}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;

    const today = new Date().toISOString().slice(0, 10);
    const inserted = await sql`
      INSERT INTO action_plans (
        reference_code, user_id, title, department, period_start, period_end,
        entry_mode, objectives, summary, status
      )
      VALUES (
        ${refCode},
        ${ownerId},
        ${String(body.title || "ERP Imported Action Plan").trim()},
        ${String(body.department || userRows[0]?.department || "Operations & Logistics")},
        ${body.period_start || today}::date,
        ${body.period_end || today}::date,
        'form',
        ${JSON.stringify(Array.isArray(body.objectives) ? body.objectives : [])}::jsonb,
        ${String(body.summary || "")},
        'submitted'
      )
      RETURNING id, reference_code, title, status, created_at;
    `;

    return NextResponse.json({
      success: true,
      entity: "action_plan",
      record: inserted[0],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "ERP ingest error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

