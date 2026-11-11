import { NextResponse } from "next/server";
import { getCurrentUser, hashPassword, destroyOtherSessions } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { full_name, department, password } = body;

    // Handle password update if provided
    if (password !== undefined) {
      if (typeof password !== "string" || password.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters." },
          { status: 400 }
        );
      }
      const newHash = await hashPassword(password);
      await sql`
        UPDATE users
        SET password_hash = ${newHash}
        WHERE id = ${user.id};
      `;
      // Invalidate all other active sessions
      await destroyOtherSessions(user.id);
    }

    // Handle profile fields if provided
    if (full_name !== undefined || department !== undefined) {
      await sql`
        UPDATE users
        SET full_name = COALESCE(${full_name}, full_name),
            department = COALESCE(${department}, department)
        WHERE id = ${user.id};
      `;
    }

    const updatedRows = await sql`
      SELECT id, email, full_name, department, role
      FROM users
      WHERE id = ${user.id}
      LIMIT 1;
    `;

    return NextResponse.json({
      success: true,
      user: updatedRows[0],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

