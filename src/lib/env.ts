/**
 * Dependency-free environment variable validation.
 *
 * Call `assertEnv()` early in server code paths (API routes, server
 * components) to fail fast with a clear message when required config is
 * missing, instead of getting cryptic database errors later.
 */

export interface Env {
  DATABASE_URL: string;
  SESSION_SECRET: string;
}

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;

  const missing: string[] = [];
  const databaseUrl = process.env.DATABASE_URL;
  const sessionSecret = process.env.SESSION_SECRET;

  if (!databaseUrl) missing.push("DATABASE_URL");
  if (!sessionSecret) missing.push("SESSION_SECRET");

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}. ` +
        `Add them to .env.local locally, or to your deployment environment settings.`
    );
  }

  if (sessionSecret.length < 16) {
    throw new Error(
      "SESSION_SECRET must be at least 16 characters long. Generate one with: openssl rand -hex 32"
    );
  }

  cachedEnv = {
    DATABASE_URL: databaseUrl as string,
    SESSION_SECRET: sessionSecret as string,
  };

  return cachedEnv;
}

/** Convenience wrapper: throws with a friendly message if env is invalid. */
export function assertEnv(): void {
  getEnv();
}
