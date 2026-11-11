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
    const { email, password, full_name, department, role, telegram_chat_id } = await request.json();

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

    // Role assignment rules
    let assignedRole: "employee" | "admin" | "super_admin" = "employee";
    if (role === "super_admin") {
      if (currentUser.role !== "super_admin") {
        return NextResponse.json(
          { error: "Only the Super Admin (CEO) can provision another Super Admin." },
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
        telegram_chat_id, telegram_linked_at
      )
      VALUES (
        ${email.trim().toLowerCase()},
        ${passwordHash},
        ${full_name.trim()},
        ${department || "Operations & Logistics"},
        ${assignedRole},
        ${cleanChatId},
        ${linkedAt}
      )
      RETURNING id, email, full_name, department, role, telegram_chat_id, telegram_username, created_at;
    `;

    return NextResponse.json({
      success: true,
      user: rows[0],
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
    const targetRows = await sql`SELECT role FROM users WHERE id = ${targetId} LIMIT 1;`;
    if (targetRows.length === 0) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const targetRole = targetRows[0].role;
    if (targetRole === "super_admin") {
      return NextResponse.json(
        { error: "Super Admin accounts cannot be deleted." },
        { status: 403 }
      );
    }

    if (targetRole === "admin" && currentUser.role !== "super_admin") {
      return NextResponse.json(
        { error: "Only the Super Admin (CEO) can delete an Administrator account." },
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
    const { id, full_name, department, role, telegram_chat_id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Missing user ID." }, { status: 400 });
    }

    const existingRows = await sql`
      SELECT id, role, full_name, department, telegram_chat_id, telegram_linked_at
      FROM users WHERE id = ${id} LIMIT 1;
    `;
    if (existingRows.length === 0) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const existing = existingRows[0];
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
          { error: "Only the Super Admin (CEO) can assign the Super Admin role." },
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

    const rows = await sql`
      UPDATE users
      SET full_name = ${typeof full_name === "string" && full_name.trim() ? full_name.trim() : existing.full_name},
          department = ${typeof department === "string" && department.trim() ? department.trim() : existing.department},
          role = ${nextRole},
          telegram_chat_id = ${cleanChatId},
          telegram_linked_at = ${nextLinkedAt}
      WHERE id = ${id}
      RETURNING id, email, full_name, department, role, telegram_chat_id, telegram_username, created_at;
    `;

    return NextResponse.json({ success: true, user: rows[0] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
