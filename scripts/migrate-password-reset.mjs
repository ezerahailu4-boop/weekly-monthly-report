import { neon } from "@neondatabase/serverless";
import { getDatabaseUrl } from "./db-env.mjs";

const sql = neon(getDatabaseUrl());

async function main() {
  console.log("Connecting to Neon database...");

  // Create password_reset_requests table
  await sql`
    CREATE TABLE IF NOT EXISTS password_reset_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'fulfilled')),
      requested_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      admin_action_by UUID REFERENCES users(id) ON DELETE SET NULL,
      admin_action_at TIMESTAMPTZ,
      admin_notes TEXT,
      new_password_hash TEXT,
      ip_address TEXT,
      user_agent TEXT,
      expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '24 hours',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  await sql`CREATE INDEX IF NOT EXISTS password_reset_requests_token_idx ON password_reset_requests (token);`;
  await sql`CREATE INDEX IF NOT EXISTS password_reset_requests_email_idx ON password_reset_requests (email);`;
  await sql`CREATE INDEX IF NOT EXISTS password_reset_requests_status_idx ON password_reset_requests (status);`;
  await sql`CREATE INDEX IF NOT EXISTS password_reset_requests_created_at_idx ON password_reset_requests (created_at DESC);`;

  console.log("password_reset_requests table created successfully!");
  console.log("Indexes created: token, email, status, created_at");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
