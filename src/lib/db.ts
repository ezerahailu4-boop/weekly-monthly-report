import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let cachedClient: NeonQueryFunction<false, false> | null = null;

function getClient(): NeonQueryFunction<false, false> {
  if (!cachedClient) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error(
        "DATABASE_URL environment variable is not set. Add it to .env.local or your deployment environment."
      );
    }
    cachedClient = neon(databaseUrl);
  }
  return cachedClient;
}

export const sql: NeonQueryFunction<false, false> = ((
  strings: TemplateStringsArray,
  ...values: unknown[]
) => {
  return getClient()(strings, ...values);
}) as NeonQueryFunction<false, false>;
