import { neon } from "@neondatabase/serverless";
import { getDatabaseUrl } from "./db-env.mjs";

const sql = neon(getDatabaseUrl());

async function main() {
  console.log("Migrating Neon database for Reporting Window, Tasks, and Telegram...");

  // 1. Add Telegram linking fields to users
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_username TEXT;`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_link_token TEXT;`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_linked_at TIMESTAMPTZ;`;
  await sql`CREATE INDEX IF NOT EXISTS users_telegram_link_token_idx ON users (telegram_link_token);`;
  console.log("Updated users table with Telegram linking columns.");

  // 2. Create portal_settings singleton table for reporting window & Telegram config
  await sql`
    CREATE TABLE IF NOT EXISTS portal_settings (
      id TEXT PRIMARY KEY DEFAULT 'default',
      window_mode TEXT NOT NULL DEFAULT 'scheduled' CHECK (window_mode IN ('scheduled', 'force_open', 'force_closed')),
      open_day INTEGER NOT NULL DEFAULT 5 CHECK (open_day BETWEEN 0 AND 6),
      open_time TEXT NOT NULL DEFAULT '06:00',
      close_day INTEGER NOT NULL DEFAULT 1 CHECK (close_day BETWEEN 0 AND 6),
      close_time TEXT NOT NULL DEFAULT '04:00',
      timezone TEXT NOT NULL DEFAULT 'Africa/Addis_Ababa',
      telegram_bot_token TEXT,
      telegram_bot_username TEXT,
      updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  await sql`
    INSERT INTO portal_settings (id, window_mode, open_day, open_time, close_day, close_time, timezone)
    VALUES ('default', 'scheduled', 5, '06:00', 1, '04:00', 'Africa/Addis_Ababa')
    ON CONFLICT (id) DO NOTHING;
  `;
  console.log("Created and initialized portal_settings table (Default: Fri 06:00 -> Mon 04:00 EAT).");

  // 3. Create tasks table
  await sql`
    CREATE TABLE IF NOT EXISTS tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      assigned_to UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
      priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
      due_date DATE,
      completion_note TEXT,
      completed_at TIMESTAMPTZ,
      telegram_notified_at TIMESTAMPTZ,
      telegram_error TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  await sql`CREATE INDEX IF NOT EXISTS tasks_assigned_to_idx ON tasks (assigned_to);`;
  await sql`CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks (status);`;
  await sql`CREATE INDEX IF NOT EXISTS tasks_due_date_idx ON tasks (due_date);`;
  console.log("Created tasks table and indexes.");

  console.log("Window, Tasks & Telegram migration completed successfully!");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

