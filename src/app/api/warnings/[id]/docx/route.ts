import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { buildDocxBufferForWarning, getWarningById } from "@/lib/warnings";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const warning = await getWarningById(id);
  if (!warning) {
    return NextResponse.json({ error: "Warning letter not found." }, { status: 404 });
  }

  const isPrivileged = user.role === "admin" || user.role === "super_admin";
  if (!isPrivileged && warning.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const buffer = await buildDocxBufferForWarning(warning);
  const safeRef = (
    warning.letter_ref || `YH-WARNING-${warning.id.slice(0, 8).toUpperCase()}`
  ).replace(/[^A-Za-z0-9-_]/g, "");

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="YETAF-Warning-Letter-${safeRef}.docx"`,
    },
  });
}

