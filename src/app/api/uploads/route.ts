import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB limit for serverless DB storage
const ALLOWED_MIME_PREFIXES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.",
  "application/vnd.ms-excel",
  "text/csv",
  "text/plain",
  "image/",
];

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "File is empty." }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "File exceeds 5 MB maximum upload size." },
        { status: 413 }
      );
    }

    const mimeType = file.type || "application/octet-stream";
    const allowed = ALLOWED_MIME_PREFIXES.some((prefix) =>
      mimeType.startsWith(prefix)
    );
    if (!allowed) {
      return NextResponse.json(
        {
          error:
            "Unsupported file type. Allowed: PDF, Word (.docx), Excel (.xlsx), CSV, TXT, or images.",
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const safeName = file.name.replace(/[^\w.\- ()]/g, "_").slice(0, 140) || "attachment";

    const rows = await sql`
      INSERT INTO uploaded_files (file_name, mime_type, size_bytes, content_base64, uploaded_by)
      VALUES (${safeName}, ${mimeType}, ${file.size}, ${base64}, ${user.id})
      RETURNING id, file_name, mime_type, size_bytes, created_at;
    `;

    const saved = rows[0];
    return NextResponse.json({
      success: true,
      file: {
        id: String(saved.id),
        file_name: String(saved.file_name),
        mime_type: String(saved.mime_type),
        size_bytes: Number(saved.size_bytes),
        url: `/api/uploads/${saved.id}`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

