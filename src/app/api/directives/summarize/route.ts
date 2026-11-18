import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { summarizeDirections } from "@/lib/directiveSummarizer";
import type { DirectionPoint } from "@/types/directive";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const rawDirections = Array.isArray(body.directions) ? body.directions : [];
    const directions: DirectionPoint[] = rawDirections
      .map((item: unknown) => {
        if (typeof item === "string") return { text: item };
        if (item && typeof item === "object") {
          const obj = item as Partial<DirectionPoint>;
          return {
            text: typeof obj.text === "string" ? obj.text : "",
            owner: typeof obj.owner === "string" ? obj.owner : undefined,
            due_date: typeof obj.due_date === "string" ? obj.due_date : undefined,
          };
        }
        return { text: "" };
      })
      .filter((d: DirectionPoint) => d.text.trim().length > 0);

    if (directions.length === 0) {
      return NextResponse.json(
        { error: "Provide at least 1 direction (2–3 recommended) to summarize." },
        { status: 400 }
      );
    }

    const result = await summarizeDirections({
      title: typeof body.title === "string" ? body.title : undefined,
      department: typeof body.department === "string" ? body.department : undefined,
      priority: typeof body.priority === "string" ? body.priority : undefined,
      dueDate: typeof body.due_date === "string" ? body.due_date : null,
      directions,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Summarization failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

