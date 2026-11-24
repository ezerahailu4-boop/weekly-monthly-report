import { NextResponse } from "next/server";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (currentUser.role !== "admin" && currentUser.role !== "super_admin") {
    return NextResponse.json(
      { error: "Forbidden: Admin or Super Admin privileges required." },
      { status: 403 }
    );
  }

  try {
    const { email, password, full_name, department, role, telegram_chat_id, company_id } = await request.json();

    if (!email || !password || !full_name) {
      return NextResponse.json(
        { error: "Email, password, and full name are required." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    let assignedCompanyId: string | null = currentUser.company_id;
    if (currentUser.role === "super_admin") {
      if (typeof company_id !== "string" || !company_id.trim()) {
        return NextResponse.json(
          { error: "Choose a company for this account." },
          { status: 400 }
        );
      }
      const companyRows = await sql`
        SELECT id FROM companies WHERE id = ${company_id.trim()} AND is_active = true LIMIT 1;
      `;
      if (companyRows.length === 0) {
        return NextResponse.json(
          { error: "Choose an active company." },
          { status: 400 }
        );
      }
      assignedCompanyId = companyRows[0].id;
    }

    if (!assignedCompanyId) {
      return NextResponse.json(
        { error: "Your admin account is not assigned to a company." },
        { status: 400 }
      );
    }

    // Role assignment rules
    let assignedRole: "employee" | "admin" | "super_admin" = "employee";
    if (role === "super_admin") {
      if (currentUser.role !== "super_admin") {
        return NextResponse.json(
          { error: "Only Direction (Super Admin) can provision another Super Admin." },
          { status: 403 }
        );
      }
      assignedRole = "super_admin";
    } else if (role === "admin") {
      assignedRole = "admin";
    } else {
      assignedRole = "employee";
    }

    // Check if email already exists in Neon
    const existing = await sql`
      SELECT id FROM users WHERE LOWER(email) = LOWER(${email.trim()}) LIMIT 1;
    `;

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "An account with this email address already exists." },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    const cleanChatId =
      typeof telegram_chat_id === "string" && telegram_chat_id.trim()
        ? telegram_chat_id.trim()
        : null;
    const linkedAt = cleanChatId ? new Date().toISOString() : null;

    const rows = await sql`
      INSERT INTO users (
        email, password_hash, full_name, department, role,
        telegram_chat_id, telegram_linked_at, company_id
      )
      VALUES (
        ${email.trim().toLowerCase()},
        ${passwordHash},
        ${full_name.trim()},
        ${department || "Operations & Logistics"},
        ${assignedRole},
        ${cleanChatId},
        ${linkedAt},
        ${assignedCompanyId}
      )
      RETURNING id, email, full_name, department, role, telegram_chat_id, telegram_username, company_id, created_at;
    `;

    const userRows = await sql`
      SELECT u.id, u.email, u.full_name, u.department, u.role,
             u.telegram_chat_id, u.telegram_username, u.company_id, u.created_at,
             c.name AS company_name, c.logo_url AS company_logo_url
      FROM users u
      LEFT JOIN companies c ON c.id = u.company_id
      WHERE u.id = ${rows[0].id}
      LIMIT 1;
    `;

    return NextResponse.json({
      success: true,
      user: userRows[0],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (currentUser.role !== "admin" && currentUser.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const targetId = searchParams.get("id");

  if (!targetId) {
    return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
  }

  if (targetId === currentUser.id) {
    return NextResponse.json(
      { error: "You cannot delete your own administrative account." },
      { status: 400 }
    );
  }

  try {
    // Check target's role
    const targetRows = await sql`SELECT role, company_id FROM users WHERE id = ${targetId} LIMIT 1;`;
    if (targetRows.length === 0) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const targetRole = targetRows[0].role;
    if (currentUser.role !== "super_admin" && targetRows[0].company_id !== currentUser.company_id) {
      return NextResponse.json({ error: "You can only manage users in your company." }, { status: 403 });
    }
    if (targetRole === "super_admin") {
      return NextResponse.json(
        { error: "Super Admin accounts cannot be deleted." },
        { status: 403 }
      );
    }

    if (targetRole === "admin" && currentUser.role !== "super_admin") {
      return NextResponse.json(
        { error: "Only Direction (Super Admin) can delete an Administrator account." },
        { status: 403 }
      );
    }

    await sql`DELETE FROM users WHERE id = ${targetId};`;
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (currentUser.role !== "admin" && currentUser.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id, full_name, department, role, telegram_chat_id, company_id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Missing user ID." }, { status: 400 });
    }

    const existingRows = await sql`
      SELECT id, role, full_name, department, telegram_chat_id, telegram_linked_at, company_id
      FROM users WHERE id = ${id} LIMIT 1;
    `;
    if (existingRows.length === 0) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const existing = existingRows[0];
    if (currentUser.role !== "super_admin" && existing.company_id !== currentUser.company_id) {
      return NextResponse.json({ error: "You can only manage users in your company." }, { status: 403 });
    }
    if (existing.role === "super_admin" && currentUser.role !== "super_admin") {
      return NextResponse.json(
        { error: "Only a Super Admin can modify a Super Admin account." },
        { status: 403 }
      );
    }

    let nextRole = existing.role;
    if (role && ["employee", "admin", "super_admin"].includes(role)) {
      if (role === "super_admin" && currentUser.role !== "super_admin") {
        return NextResponse.json(
          { error: "Only Direction (Super Admin) can assign the Super Admin role." },
          { status: 403 }
        );
      }
      nextRole = role;
    }

    const cleanChatId =
      telegram_chat_id === undefined
        ? existing.telegram_chat_id
        : typeof telegram_chat_id === "string" && telegram_chat_id.trim()
        ? telegram_chat_id.trim()
        : null;

    const nextLinkedAt = cleanChatId
      ? existing.telegram_linked_at || new Date().toISOString()
      : null;

    let nextCompanyId = existing.company_id;
    if (company_id !== undefined) {
      if (currentUser.role !== "super_admin") {
        return NextResponse.json({ error: "Only a Super Admin can change a user's company." }, { status: 403 });
      }
      if (typeof company_id !== "string" || !company_id.trim()) {
        return NextResponse.json({ error: "Choose a company." }, { status: 400 });
      }
      const companyRows = await sql`SELECT id FROM companies WHERE id = ${company_id.trim()} AND is_active = true LIMIT 1;`;
      if (companyRows.length === 0) {
        return NextResponse.json({ error: "Choose an active company." }, { status: 400 });
      }
      nextCompanyId = companyRows[0].id;
    }

    const rows = await sql`
      UPDATE users
      SET full_name = ${typeof full_name === "string" && full_name.trim() ? full_name.trim() : existing.full_name},
          department = ${typeof department === "string" && department.trim() ? department.trim() : existing.department},
          role = ${nextRole},
          telegram_chat_id = ${cleanChatId},
          telegram_linked_at = ${nextLinkedAt},
          company_id = ${nextCompanyId}
      WHERE id = ${id}
      RETURNING id, email, full_name, department, role, telegram_chat_id, telegram_username, company_id, created_at;
    `;
    const userRows = await sql`
      SELECT u.id, u.email, u.full_name, u.department, u.role,
             u.telegram_chat_id, u.telegram_username, u.company_id, u.created_at,
             c.name AS company_name, c.logo_url AS company_logo_url
      FROM users u LEFT JOIN companies c ON c.id = u.company_id
      WHERE u.id = ${rows[0].id} LIMIT 1;
    `;
    return NextResponse.json({ success: true, user: userRows[0] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
