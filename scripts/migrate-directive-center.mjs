import { neon } from "@neondatabase/serverless";
import { getDatabaseUrl } from "./db-env.mjs";

const sql = neon(getDatabaseUrl());

async function main() {
  console.log("Migrating Neon database for Directive Follow-up System (Report Follow-up Center)...");

  // 1. Uploaded files table (serverless-safe dual data-entry storage)
  await sql`
    CREATE TABLE IF NOT EXISTS uploaded_files (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      content_base64 TEXT NOT NULL,
      uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
  console.log("Ensured uploaded_files table.");

  // 2. Directives table (core entity for Directive Follow-up System)
  await sql`
    CREATE TABLE IF NOT EXISTS directives (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reference_code TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      department TEXT NOT NULL DEFAULT 'All Departments',
      priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
      directions JSONB NOT NULL DEFAULT '[]'::jsonb,
      executive_summary TEXT NOT NULL DEFAULT '',
      entry_mode TEXT NOT NULL DEFAULT 'form' CHECK (entry_mode IN ('form', 'upload')),
      attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'awaiting_response', 'completed', 'closed')),
      due_date DATE,
      sla_days INTEGER NOT NULL DEFAULT 3 CHECK (sla_days BETWEEN 1 AND 60),
      last_comment_at TIMESTAMPTZ,
      sla_due_at TIMESTAMPTZ,
      source_report_id UUID REFERENCES reports(id) ON DELETE SET NULL,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS directives_status_idx ON directives (status);`;
  await sql`CREATE INDEX IF NOT EXISTS directives_department_idx ON directives (department);`;
  await sql`CREATE INDEX IF NOT EXISTS directives_created_at_idx ON directives (created_at DESC);`;
  console.log("Ensured directives table and indexes.");

  // 3. Link tasks to directives for multi-tasking under a single directive
  await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS directive_id UUID REFERENCES directives(id) ON DELETE SET NULL;`;
  await sql`CREATE INDEX IF NOT EXISTS tasks_directive_id_idx ON tasks (directive_id);`;
  console.log("Updated tasks table with directive_id foreign key.");

  // 4. Contextual in-app chat comments per directive (triggers SLA countdown)
  await sql`
    CREATE TABLE IF NOT EXISTS directive_comments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      directive_id UUID NOT NULL REFERENCES directives(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      message TEXT NOT NULL,
      attachment JSONB,
      requires_response BOOLEAN NOT NULL DEFAULT true,
      sla_deadline_at TIMESTAMPTZ,
      responded_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS directive_comments_directive_idx ON directive_comments (directive_id, created_at ASC);`;
  console.log("Ensured directive_comments table and indexes.");

  // 5. Action plans submission module
  await sql`
    CREATE TABLE IF NOT EXISTS action_plans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reference_code TEXT UNIQUE NOT NULL,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      directive_id UUID REFERENCES directives(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      department TEXT NOT NULL DEFAULT 'Operations & Logistics',
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      entry_mode TEXT NOT NULL DEFAULT 'form' CHECK (entry_mode IN ('form', 'upload')),
      objectives JSONB NOT NULL DEFAULT '[]'::jsonb,
      summary TEXT NOT NULL DEFAULT '',
      attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
      status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'approved', 'revision_requested', 'completed')),
      review_notes TEXT,
      reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
      reviewed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS action_plans_user_idx ON action_plans (user_id);`;
  await sql`CREATE INDEX IF NOT EXISTS action_plans_directive_idx ON action_plans (directive_id);`;
  await sql`CREATE INDEX IF NOT EXISTS action_plans_status_idx ON action_plans (status);`;
  console.log("Ensured action_plans table and indexes.");

  // 6. Extend portal_settings for SLA timer, Official Letterhead, System Title, ERP API key, and Penalty Policy Hold
  await sql`ALTER TABLE portal_settings ADD COLUMN IF NOT EXISTS sla_response_days INTEGER NOT NULL DEFAULT 3;`;
  await sql`ALTER TABLE portal_settings ADD COLUMN IF NOT EXISTS system_name TEXT NOT NULL DEFAULT 'Directive Follow-up System';`;
  await sql`ALTER TABLE portal_settings ADD COLUMN IF NOT EXISTS letterhead_config JSONB NOT NULL DEFAULT '{}'::jsonb;`;
  await sql`ALTER TABLE portal_settings ADD COLUMN IF NOT EXISTS erp_api_key TEXT;`;
  await sql`ALTER TABLE portal_settings ADD COLUMN IF NOT EXISTS penalty_policy_verified BOOLEAN NOT NULL DEFAULT false;`;

  // Pause unverified automatic penalty escalation by default until aligned with official HR policy
  await sql`
    UPDATE portal_settings
    SET auto_warn_enabled = false,
        penalty_policy_verified = false
    WHERE id = 'default';
  `;
  console.log("Extended portal_settings with SLA countdown, letterhead config, ERP key, and paused unverified penalty auto-enforcement.");

  // 7. Terminology migration in database records: replace 'CEO' titles/departments with 'Direction'
  await sql`
    UPDATE users
    SET full_name = 'Executive Direction',
        department = 'Office of Direction & Board'
    WHERE role = 'super_admin'
      AND (full_name ILIKE '%CEO%' OR department ILIKE '%CEO%');
  `;
  await sql`
    UPDATE users
    SET department = REPLACE(department, 'CEO', 'Direction')
    WHERE department ILIKE '%CEO%';
  `;
  console.log("Updated database user/department labels from CEO to Direction.");

  console.log("Directive Follow-up System migration completed successfully!");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

