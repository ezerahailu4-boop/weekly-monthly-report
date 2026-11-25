import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

// Fail fast at module load if the database is not configured. This surfaces
// a clear error on deploy instead of crashing mid-request later.
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error(
    "DATABASE_URL environment variable is not set. Add it to .env.local or your deployment environment."
  );
}

let cachedClient: NeonQueryFunction<false, false> | null = null;

function getClient(): NeonQueryFunction<false, false> {
  if (!cachedClient) {
    cachedClient = neon(DATABASE_URL!);
  }
  return cachedClient;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const QUERY_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 3;

function isTransientError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message;
  return (
    msg === "Query timeout" ||
    /ECONNRESET|ETIMEDOUT|ENOTFOUND|ECONNREFUSED|socket hang up/i.test(msg)
  );
}

async function queryWithRetry(
  fn: NeonQueryFunction<false, false>,
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<unknown> {
  let lastErr: unknown = new Error("Query failed after retries");
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Query timeout")), QUERY_TIMEOUT_MS)
      );
      return await Promise.race([fn(strings, ...values), timeout]);
    } catch (err: unknown) {
      lastErr = err;
      if (!isTransientError(err) || attempt === MAX_RETRIES - 1) {
        throw err;
      }
      await sleep(500 * (attempt + 1));
    }
  }
  throw lastErr;
}

export const sql: NeonQueryFunction<false, false> = (async (
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<unknown> => {
  return queryWithRetry(getClient(), strings, ...values);
}) as NeonQueryFunction<false, false>;
