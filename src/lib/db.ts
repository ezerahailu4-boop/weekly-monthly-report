import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { getEnv } from "./env";

let cachedClient: NeonQueryFunction<false, false> | null = null;

function getClient(): NeonQueryFunction<false, false> {
  if (!cachedClient) {
    const { DATABASE_URL: databaseUrl } = getEnv();
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
