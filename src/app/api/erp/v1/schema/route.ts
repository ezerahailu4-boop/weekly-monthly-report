import { NextResponse } from "next/server";

/**
 * GET /api/erp/v1/schema
 * Self-documenting REST contract for ERP integration engineering teams.
 */
export async function GET() {
  return NextResponse.json({
    openapi_like: "1.0",
    service: "YETAF Directive Follow-up System / Report Follow-up Center",
    authentication: {
      scheme: "Bearer Token",
      header: "Authorization: Bearer <ERP_API_KEY>",
      configuration: "Generate or rotate the key inside Admin Governance -> ERP Integration.",
    },
    endpoints: [
      {
        method: "GET",
        path: "/api/erp/v1/export",
        query: { entity: "all | directives | plans | tasks | reports" },
        description: "Pull latest directives, action plans, tasks, and performance reports in structured JSON.",
      },
      {
        method: "POST",
        path: "/api/erp/v1/ingest",
        body_example: {
          entity: "directive",
          title: "Q4 Logistics & Cashflow Optimization",
          department: "Operations & Logistics",
          priority: "high",
          due_date: "2026-12-15",
          sla_days: 3,
          directions: [
            { text: "Audit all fleet fuel vouchers by Friday", owner: "Ops Lead" },
            { text: "Submit revised spare parts procurement schedule", owner: "Procurement" },
          ],
        },
        description: "Push an ERP-originated directive or action plan directly into the Follow-up Center.",
      },
    ],
  });
}

