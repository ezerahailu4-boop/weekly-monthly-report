import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;
  // Regular admin can only read their own company.
  const companyId = user.role === "super_admin" ? id : user.company_id;
  if (!companyId) {
    return NextResponse.json({ error: "No company context." }, { status: 400 });
  }

  try {
    const rows = await sql`
      SELECT c.id, c.name, c.slug, c.logo_url, c.is_active, c.created_at,
             cs.window_mode, cs.open_day, cs.open_time, cs.close_day, cs.close_time,
             cs.timezone, cs.auto_warn_enabled, cs.penalty_policy_verified,
             cs.sla_response_days, cs.system_name, cs.letterhead_config,
             cs.erp_api_key, cs.updated_at
      FROM companies c
      LEFT JOIN company_settings cs ON cs.company_id = c.id
      WHERE c.id = ${companyId}
      LIMIT 1;
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Company not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, company: rows[0] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "super_admin") {
    return NextResponse.json(
      { error: "Forbidden: Super admin privileges required." },
      { status: 403 }
    );
  }

  const { id } = await params;
  try {
    const body = await request.json();
    const { name, slug, logo_url, is_active } = body;

    // If slug is being changed, validate it's unique.
    if (typeof slug === "string" && slug.trim()) {
      const cleanSlug = String(slug)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      if (!cleanSlug) {
        return NextResponse.json({ error: "Invalid slug." }, { status: 400 });
      }
      const clash = await sql`
        SELECT id FROM companies WHERE slug = ${cleanSlug} AND id <> ${id} LIMIT 1;
      `;
      if (clash.length > 0) {
        return NextResponse.json({ error: "Slug already in use." }, { status: 409 });
      }
    }

    // Apply each provided field with its own parameterized statement.
    if (typeof name === "string" && name.trim()) {
      await sql`UPDATE companies SET name = ${name.trim()} WHERE id = ${id}`;
    }
    if (typeof slug === "string" && slug.trim()) {
      const cleanSlug = String(slug)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      if (cleanSlug) {
        await sql`UPDATE companies SET slug = ${cleanSlug} WHERE id = ${id}`;
      }
    }
    if (typeof logo_url === "string") {
      await sql`UPDATE companies SET logo_url = ${logo_url || null} WHERE id = ${id}`;
    }
    if (typeof is_active === "boolean") {
      await sql`UPDATE companies SET is_active = ${is_active} WHERE id = ${id}`;
    }

    const rows = await sql`
      SELECT id, name, slug, logo_url, is_active, updated_at
      FROM companies WHERE id = ${id};
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Company not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, company: rows[0] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "super_admin") {
    return NextResponse.json(
      { error: "Forbidden: Super admin privileges required." },
      { status: 403 }
    );
  }

  const { id } = await params;
  try {
    // Soft delete: mark inactive instead of hard delete (protects data integrity).
    const rows = await sql`
      UPDATE companies SET is_active = false WHERE id = ${id}
      RETURNING id, name, is_active;
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Company not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, company: rows[0] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
