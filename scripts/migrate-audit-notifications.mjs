import { neon } from "@neondatabase/serverless";
import { getDatabaseUrl } from "./db-env.mjs";

const sql = neon(getDatabaseUrl());

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS activity_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id UUID,
      details JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS activity_log_entity_idx ON activity_log (entity_type, entity_id, created_at DESC);`;
  await sql`CREATE INDEX IF NOT EXISTS activity_log_actor_idx ON activity_log (actor_id, created_at DESC);`;
  await sql`
    INSERT INTO activity_log (actor_id, action, entity_type, entity_id, details, created_at)
    SELECT r.user_id,
           CASE WHEN r.status = 'draft' THEN 'saved draft' ELSE 'submitted' END,
           'report', r.id,
           jsonb_build_object('reportType', r.report_type, 'periodStart', r.period_start, 'periodEnd', r.period_end),
           r.created_at
    FROM reports r
    WHERE NOT EXISTS (
      SELECT 1 FROM activity_log a WHERE a.entity_type = 'report' AND a.entity_id = r.id
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      href TEXT,
      kind TEXT NOT NULL DEFAULT 'info',
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON notifications (user_id, created_at DESC) WHERE read_at IS NULL;`;
  console.log("Activity history and in-app notifications are ready.");
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
