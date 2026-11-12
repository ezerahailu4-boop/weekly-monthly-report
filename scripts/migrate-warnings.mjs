import { neon } from "@neondatabase/serverless";
import { getDatabaseUrl } from "./db-env.mjs";

const sql = neon(getDatabaseUrl());

async function main() {
  console.log("Migrating Neon database for Disciplinary Warnings & Auto-Enforcement...");

  // 1. Add auto_warn_enabled setting to portal_settings
  await sql`
    ALTER TABLE portal_settings
    ADD COLUMN IF NOT EXISTS auto_warn_enabled BOOLEAN NOT NULL DEFAULT true;
  `;
  console.log("Updated portal_settings with auto_warn_enabled flag.");

  // 2. Create disciplinary_warnings table
  await sql`
    CREATE TABLE IF NOT EXISTS disciplinary_warnings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      issued_by UUID REFERENCES users(id) ON DELETE SET NULL,
      report_type TEXT NOT NULL CHECK (report_type IN ('weekly', 'monthly')),
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      period_label TEXT NOT NULL,
      strike_number INTEGER NOT NULL CHECK (strike_number >= 1),
      warning_level TEXT NOT NULL CHECK (warning_level IN ('verbal_warning', 'written_letter')),
      letter_ref TEXT,
      letter_subject TEXT,
      letter_body TEXT,
      trigger_source TEXT NOT NULL DEFAULT 'manual' CHECK (trigger_source IN ('auto', 'manual')),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'revoked')),
      acknowledged_at TIMESTAMPTZ,
      telegram_sent_at TIMESTAMPTZ,
      telegram_error TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  // Prevent duplicate active/acknowledged warnings for the same user + missed period
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS disciplinary_warnings_unique_active_period_idx
      ON disciplinary_warnings (user_id, report_type, period_start, period_end)
      WHERE status <> 'revoked';
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS disciplinary_warnings_user_created_idx
      ON disciplinary_warnings (user_id, created_at DESC);
  `;

  console.log("Created disciplinary_warnings table and indexes.");
  console.log("Disciplinary Warnings migration completed successfully!");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

