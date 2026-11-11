import { cookies } from "next/headers";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { sql } from "./db";
import { SESSION_COOKIE_NAME } from "./constants";

export { SESSION_COOKIE_NAME };

export type UserRole = "employee" | "admin" | "super_admin";

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  department: string;
  role: UserRole;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const rows = await sql`
      SELECT u.id, u.email, u.full_name, u.department, u.role
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ${token} AND s.expires_at > now()
      LIMIT 1;
    `;

    if (rows.length === 0) return null;

    const u = rows[0];
    return {
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      department: u.department,
      role: u.role as UserRole,
    };
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "digest" in err &&
      (err as { digest?: string }).digest === "DYNAMIC_SERVER_USAGE"
    ) {
      throw err;
    }
    console.error("Error retrieving current user:", err);
    return null;
  }
}

export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const cookieStore = await cookies();

  await sql`
    INSERT INTO sessions (id, user_id, expires_at)
    VALUES (${token}, ${userId}, now() + interval '30 days');
  `;

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: "/",
  });

  return token;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    try {
      await sql`DELETE FROM sessions WHERE id = ${token};`;
    } catch {
      // ignore
    }
  }

  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });
}

export async function destroyOtherSessions(userId: string): Promise<void> {
  const cookieStore = await cookies();
  const currentToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (currentToken) {
    try {
      await sql`DELETE FROM sessions WHERE user_id = ${userId} AND id != ${currentToken};`;
    } catch {
      // ignore
    }
  }
}

