import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { auditLog } from "@/lib/audit";

function clientMeta(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  const userAgent = request.headers.get("user-agent") ?? null;
  return { ip, userAgent };
}

export async function POST(request: Request) {
  const { ip, userAgent } = clientMeta(request);

  try {
    const { email, password } = await request.json();

    // Rate limit: 5 attempts per IP per 60 seconds
    const limit = rateLimit(request, { max: 5, windowMs: 60_000, scope: "login-route" });
    if (!limit.success) {
      await auditLog({
        actorEmail: (email || "unknown").toLowerCase(),
        actorRole: "unknown",
        action: "login.rate_limited",
        description: `Rate limit exceeded for login attempt`,
        ipAddress: ip,
        userAgent: userAgent,
      });
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    if (!email || !password) {
      await auditLog({
        actorEmail: (email || "unknown").toLowerCase(),
        actorRole: "unknown",
        action: "login.failure",
        description: "Login attempt with missing email or password",
        ipAddress: ip,
        userAgent: userAgent,
      });
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const trimmedEmail = (email || "").trim().toLowerCase();
    const safeEmail = trimmedEmail.replace(/[\r\n\t]/g, "");
    console.log(`[AUTH] Login attempt for: "${safeEmail}"`);

    const rows = await sql`
      SELECT id, email, password_hash, full_name, department, role
      FROM users
      WHERE LOWER(email) = ${trimmedEmail}
      LIMIT 1;
    `;

    if (rows.length === 0) {
      await auditLog({
        actorEmail: safeEmail,
        actorRole: "unknown",
        action: "login.failure",
        description: `Failed login: user not found`,
        ipAddress: ip,
        userAgent: userAgent,
      });
      console.warn(`[AUTH] User not found for email: "${safeEmail}"`);
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
      await auditLog({
        actorId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        action: "login.failure",
        description: `Failed login: incorrect password`,
        ipAddress: ip,
        userAgent: userAgent,
      });
      console.warn(`[AUTH] Password mismatch for user: "${safeEmail}"`);
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    await createSession(user.id);

    await auditLog({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: "login.success",
      description: `Successful sign-in`,
      ipAddress: ip,
      userAgent: userAgent,
    });

    console.log(`[AUTH] Login successful for: "${safeEmail}" (${user.role})`);

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
