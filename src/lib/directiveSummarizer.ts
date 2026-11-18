import type { DirectionPoint } from "@/types/directive";

export interface SummarizeDirectionsInput {
  title?: string;
  department?: string;
  priority?: string;
  dueDate?: string | null;
  directions: DirectionPoint[];
}

export interface SummarizeDirectionsResult {
  summary: string;
  engine: "gemini" | "smart-synthesis";
  directionCount: number;
}

function cleanSentence(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function smartFallbackSynthesize(input: SummarizeDirectionsInput): string {
  const valid = input.directions
    .map((d) => ({
      text: (d.text || "").trim(),
      owner: (d.owner || "").trim(),
      due_date: (d.due_date || "").trim(),
    }))
    .filter((d) => d.text.length > 0);

  if (valid.length === 0) {
    return "";
  }

  const scope =
    input.department && input.department !== "All Departments"
      ? `the ${input.department} division`
      : "all relevant Yetaf Holding units";

  const priorityNote =
    input.priority === "urgent"
      ? "with urgent executive priority"
      : input.priority === "high"
      ? "as a high-priority operational mandate"
      : "for coordinated follow-up";

  const headline = input.title?.trim()
    ? `Executive Directive Summary — ${input.title.trim()}: `
    : "Executive Directive Summary: ";

  const intro = `${headline}Direction has issued ${valid.length} coordinated mandate${
    valid.length === 1 ? "" : "s"
  } for ${scope} ${priorityNote}${
    input.dueDate ? `, targeting overall completion by ${input.dueDate}` : ""
  }.`;

  const actionClauses = valid.map((d, idx) => {
    const metaParts: string[] = [];
    if (d.owner) metaParts.push(`Owner: ${d.owner}`);
    if (d.due_date) metaParts.push(`Due: ${d.due_date}`);
    const metaSuffix = metaParts.length > 0 ? ` (${metaParts.join(", ")})` : "";
    return `(${idx + 1}) ${cleanSentence(d.text).replace(/\.$/, "")}${metaSuffix}`;
  });

  const body = `Key action items require units to execute: ${actionClauses.join("; ")}.`;

  const closing =
    "Assigned leads must confirm execution updates via the directive discussion thread within the active SLA response window and log supporting evidence or action plans in the Report Follow-up Center.";

  return `${intro}\n\n${body}\n\n${closing}`;
}

/**
 * Synthesizes 2–3 directions/directives into a concise executive summary.
 * Automatically calls Gemini API when GEMINI_API_KEY is configured, and falls back
 * seamlessly to the built-in smart synthesis engine so it works immediately with zero config.
 */
export async function summarizeDirections(
  input: SummarizeDirectionsInput
): Promise<SummarizeDirectionsResult> {
  const valid = input.directions.filter((d) => d.text && d.text.trim().length > 0);
  if (valid.length === 0) {
    return { summary: "", engine: "smart-synthesis", directionCount: 0 };
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (apiKey) {
    try {
      const prompt = [
        "You are an Executive Chief of Staff writing for YETAF Holding Limited's Directive Follow-up System.",
        "Synthesize the following 2–3 corporate directions into a crisp, boardroom-ready executive summary (2 short paragraphs, max 110 words).",
        "Highlight the unified strategic objective, accountable owners/deadlines if provided, and clear follow-up expectations. Do not use markdown asterisks.",
        input.title ? `Directive Title: ${input.title}` : "",
        input.department ? `Target Division: ${input.department}` : "",
        input.priority ? `Priority: ${input.priority}` : "",
        input.dueDate ? `Overall Deadline: ${input.dueDate}` : "",
        "Directions:",
        ...valid.map(
          (d, i) =>
            `${i + 1}. ${d.text.trim()}${d.owner ? ` [Owner: ${d.owner}]` : ""}${
              d.due_date ? ` [Due: ${d.due_date}]` : ""
            }`
        ),
      ]
        .filter(Boolean)
        .join("\n");

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(
          apiKey
        )}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 280 },
          }),
          signal: AbortSignal.timeout(9000),
        }
      );

      if (res.ok) {
        const json = (await res.json()) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        const aiText = json.candidates?.[0]?.content?.parts
          ?.map((p) => p.text || "")
          .join("")
          .trim();
        if (aiText && aiText.length > 25) {
          return {
            summary: aiText,
            engine: "gemini",
            directionCount: valid.length,
          };
        }
      }
    } catch (err) {
      console.warn("Gemini summarization unavailable, falling back to smart synthesis:", err);
    }
  }

  return {
    summary: smartFallbackSynthesize(input),
    engine: "smart-synthesis",
    directionCount: valid.length,
  };
}

