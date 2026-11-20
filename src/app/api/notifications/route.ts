import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await sql`
    SELECT id, title, message, href, kind, read_at, created_at
    FROM notifications WHERE user_id = ${user.id}
    ORDER BY created_at DESC LIMIT 30;
  `;
  return NextResponse.json({ notifications: rows });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (body.all === true) {
    await sql`UPDATE notifications SET read_at = now() WHERE user_id = ${user.id} AND read_at IS NULL;`;
  } else if (typeof body.id === "string") {
    await sql`UPDATE notifications SET read_at = now() WHERE id = ${body.id} AND user_id = ${user.id};`;
  } else {
    return NextResponse.json({ error: "Provide an id or all=true." }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
