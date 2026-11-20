import { neon } from "@neondatabase/serverless";
import { getDatabaseUrl } from "./db-env.mjs";

const sql = neon(getDatabaseUrl());

async function main() {
  console.log("Connecting to Neon database...");

  // Create audit_logs table
  await sql`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
      actor_email TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      resource_type TEXT,
      resource_id TEXT,
      description TEXT,
      metadata JSONB DEFAULT '{}',
      ip_address TEXT,
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  await sql`CREATE INDEX IF NOT EXISTS audit_logs_actor_id_idx ON audit_logs (actor_id);`;
  await sql`CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs (created_at DESC);`;
  await sql`CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs (action);`;

  console.log("Audit log table created successfully!");
  console.log("Indexes created: actor_id, created_at, action");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
