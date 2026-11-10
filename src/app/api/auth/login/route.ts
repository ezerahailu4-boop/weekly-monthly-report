import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const trimmedEmail = (email || "").trim().toLowerCase();
    console.log(`[AUTH] Login attempt for: "${trimmedEmail}"`);

    const rows = await sql`
      SELECT id, email, password_hash, full_name, department, role
      FROM users
      WHERE LOWER(email) = ${trimmedEmail}
      LIMIT 1;
    `;

    if (rows.length === 0) {
      console.warn(`[AUTH] User not found for email: "${trimmedEmail}"`);
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const user = rows[0];
    let passwordMatch = await verifyPassword(password, user.password_hash);
    if (!passwordMatch && typeof password === "string" && password.trim() !== password) {
      passwordMatch = await verifyPassword(password.trim(), user.password_hash);
    }

    if (!passwordMatch) {
      console.warn(`[AUTH] Password mismatch for user: "${trimmedEmail}"`);
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    console.log(`[AUTH] Login successful for: "${trimmedEmail}" (${user.role})`);

    // Create session in Neon
    await createSession(user.id);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        department: user.department,
        role: user.role,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Login API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

