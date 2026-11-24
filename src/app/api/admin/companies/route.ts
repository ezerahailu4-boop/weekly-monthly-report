import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = user.role === "admin" || user.role === "super_admin";
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Forbidden: Admin privileges required." },
      { status: 403 }
    );
  }

  try {
    // Super admin sees all companies; regular admin sees only their own.
    const rows =
      user.role === "super_admin"
        ? await sql`
            SELECT c.id, c.name, c.slug, c.logo_url, c.is_active, c.created_at,
                   cs.window_mode, cs.open_day, cs.open_time, cs.close_day, cs.close_time,
                   cs.system_name, cs.sla_response_days
            FROM companies c
            LEFT JOIN company_settings cs ON cs.company_id = c.id
            ORDER BY c.name
          `
        : await sql`
            SELECT c.id, c.name, c.slug, c.logo_url, c.is_active, c.created_at,
                   cs.window_mode, cs.open_day, cs.open_time, cs.close_day, cs.close_time,
                   cs.system_name, cs.sla_response_days
            FROM companies c
            LEFT JOIN company_settings cs ON cs.company_id = c.id
            WHERE c.id = ${user.company_id}
            ORDER BY c.name
          `;

    return NextResponse.json({ success: true, companies: rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "super_admin") {
    return NextResponse.json(
      { error: "Forbidden: Super admin privileges required to create companies." },
      { status: 403 }
    );
  }

  try {
    const { name, slug, logo_url } = await request.json();

    if (!name || !slug) {
      return NextResponse.json(
        { error: "Company name and slug are required." },
        { status: 400 }
      );
    }

    const cleanSlug = String(slug)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    if (!cleanSlug) {
      return NextResponse.json({ error: "Invalid slug." }, { status: 400 });
    }

    const existing = await sql`SELECT id FROM companies WHERE slug = ${cleanSlug} LIMIT 1;`;
    if (existing.length > 0) {
      return NextResponse.json({ error: "A company with this slug already exists." }, { status: 409 });
    }

    const rows = await sql`
      INSERT INTO companies (name, slug, logo_url, is_active)
      VALUES (${name.trim()}, ${cleanSlug}, ${logo_url || null}, true)
      RETURNING id, name, slug, logo_url, is_active, created_at;
    `;

    return NextResponse.json({ success: true, company: rows[0] }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
