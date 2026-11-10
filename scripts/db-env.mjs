import fs from "node:fs";
import path from "node:path";

/**
 * Resolve DATABASE_URL from process.env or local .env.local without hardcoding secrets.
 */
export function getDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const envLocalPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envLocalPath)) {
    const content = fs.readFileSync(envLocalPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      if (key === "DATABASE_URL") {
        return trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      }
    }
  }

  throw new Error(
    "DATABASE_URL is not set. Provide it via environment variable or .env.local."
  );
}
