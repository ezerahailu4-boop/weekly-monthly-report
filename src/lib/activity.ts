import { sql } from "@/lib/db";

export async function recordActivity(input: {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown>;
}) {
  await sql`
    INSERT INTO activity_log (actor_id, action, entity_type, entity_id, details)
    VALUES (${input.actorId}, ${input.action}, ${input.entityType}, ${input.entityId}, ${JSON.stringify(input.details ?? {})});
  `;
}

export async function createNotification(input: {
  userId: string;
  title: string;
  message: string;
  href?: string | null;
  kind?: "info" | "success" | "warning";
}) {
  await sql`
    INSERT INTO notifications (user_id, title, message, href, kind)
    VALUES (${input.userId}, ${input.title}, ${input.message}, ${input.href ?? null}, ${input.kind ?? "info"});
  `;
}
