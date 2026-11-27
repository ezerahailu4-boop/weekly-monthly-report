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

  const { id } = await params;

  const rows = await sql`
    SELECT f.file_name, f.mime_type, f.content_base64, f.uploaded_by, u.company_id AS uploader_company_id
    FROM uploaded_files f
    LEFT JOIN users u ON f.uploaded_by = u.id
    WHERE f.id = ${id}
    LIMIT 1;
  `;

  if (rows.length === 0) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const file = rows[0];
  const isSuperAdmin = user.role === "super_admin";
  const isOwner = file.uploaded_by === user.id;
  const isSameCompany =
    !!user.company_id &&
    !!file.uploader_company_id &&
    file.uploader_company_id === user.company_id;

  if (!isSuperAdmin && !isOwner && !isSameCompany && file.uploaded_by !== null) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const buffer = Buffer.from(String(file.content_base64), "base64");
  const safeName = String(file.file_name || "document").replace(/"/g, "");

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": String(file.mime_type || "application/octet-stream"),
      "Content-Disposition": `inline; filename="${safeName}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}

