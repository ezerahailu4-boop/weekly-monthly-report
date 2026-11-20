import { sql } from "@/lib/db";

export type AuditAction =
  | "login.success"
  | "login.failure"
  | "login.rate_limited"
  | "logout"
  | "report.create"
  | "report.update"
  | "report.delete"
  | "report.submit"
  | "report.review"
  | "user.create"
  | "user.delete"
  | "user.update"
  | "password.change"
  | "session.rotate"
  | "settings.update"
  | "directive.create"
  | "directive.update"
  | "directive.close"
  | "task.create"
  | "task.update"
  | "task.complete"
  | "warning.create"
  | "export.csv"
  | "export.docx"
  | "export.pdf";

export interface AuditLogInput {
  actorId?: string | null;
  actorEmail: string;
  actorRole: string;
  action: AuditAction;
  resourceType?: string | null;
  resourceId?: string | null;
  description: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function auditLog(input: AuditLogInput): Promise<void> {
  try {
    await sql`
      INSERT INTO audit_logs (
        actor_id, actor_email, actor_role, action, resource_type,
        resource_id, description, metadata, ip_address, user_agent
      )
      VALUES (
        ${input.actorId ?? null},
        ${input.actorEmail},
        ${input.actorRole},
        ${input.action},
        ${input.resourceType ?? null},
        ${input.resourceId ?? null},
        ${input.description},
        ${JSON.stringify(input.metadata ?? {})},
        ${input.ipAddress ?? null},
        ${input.userAgent ?? null}
      );
    `;
  } catch (err) {
    // Audit logging must never break the primary request flow
    console.error("Audit log write failed:", err);
  }
}
