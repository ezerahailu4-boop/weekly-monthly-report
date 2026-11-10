import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { getDatabaseUrl } from "./db-env.mjs";

const sql = neon(getDatabaseUrl());

async function main() {
  console.log("Connecting to Neon database...");

  // 1. Create extension
  await sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`;

  // 2. Create users table
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      department TEXT NOT NULL DEFAULT 'Operations & Logistics',
      role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'admin')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  // 3. Create sessions table
  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  // 4. Create reports table
  await sql`
    CREATE TABLE IF NOT EXISTS reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      report_type TEXT NOT NULL CHECK (report_type IN ('weekly', 'monthly')),
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'reviewed')),
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  // 5. Create indexes
  await sql`CREATE INDEX IF NOT EXISTS reports_user_id_idx ON reports (user_id);`;
  await sql`CREATE INDEX IF NOT EXISTS reports_type_idx ON reports (report_type);`;
  await sql`CREATE INDEX IF NOT EXISTS reports_period_idx ON reports (period_start, period_end);`;
  await sql`CREATE INDEX IF NOT EXISTS reports_status_idx ON reports (status);`;

  // 6. Seed default administrator
  const adminEmail = "admin@yetta-holding.com";
  const adminPassword = "YettaAdmin2026!";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const existing = await sql`SELECT id FROM users WHERE email = ${adminEmail};`;

  if (existing.length === 0) {
    await sql`
      INSERT INTO users (email, password_hash, full_name, department, role)
      VALUES (
        ${adminEmail},
        ${passwordHash},
        'Executive Administrator',
        'Executive Management',
        'admin'
      );
    `;
    console.log(`Seeded default admin: ${adminEmail} (password: ${adminPassword})`);
  } else {
    await sql`
      UPDATE users
      SET password_hash = ${passwordHash},
          role = 'admin',
          full_name = 'Executive Administrator',
          department = 'Executive Management'
      WHERE email = ${adminEmail};
    `;
    console.log(`Updated default admin: ${adminEmail}`);
  }

  console.log("Neon database migration completed successfully!");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

