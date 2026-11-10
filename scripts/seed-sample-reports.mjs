import { neon } from "@neondatabase/serverless";
import { getDatabaseUrl } from "./db-env.mjs";

const sql = neon(getDatabaseUrl());

async function main() {
  console.log("Seeding rich sample reports for YETAF HOLDING...");

  const staffUsers = await sql`SELECT id FROM users WHERE email = 'operations@yetaf-holding.com' LIMIT 1;`;
  const ceoUsers = await sql`SELECT id FROM users WHERE email = 'ceo@yetaf-holding.com' LIMIT 1;`;

  if (staffUsers.length === 0 || ceoUsers.length === 0) {
    console.error("Required users not found. Run rename-to-yetaf.mjs first.");
    process.exit(1);
  }

  const staffId = staffUsers[0].id;
  const ceoId = ceoUsers[0].id;

  // Sample Weekly Report (Authored by Operations Staff, awaiting review)
  const weeklyData = {
    reportingWeekFrom: "2026-11-02",
    reportingWeekTo: "2026-11-08",
    preparedBy: "Abebe Tadesse (Operations & Logistics)",
    executiveSummary:
      "1. Q4 revenue tracking at 104% of baseline budget following corporate contract renewals.\n2. Subsidiary logistics turnaround time reduced by 1.8 days across the primary supply chain.\n3. Fuel price volatility continues to require active freight indexing and board tariff review.",
    kpiRows: [
      {
        kpi: "Subsidiary fleet operational uptime",
        target: "95%",
        performance: "97.8%",
        percentAchievement: "103%",
        remark: "Exceeded target due to preventive maintenance schedule.",
      },
      {
        kpi: "Commercial freight contract renewals (units)",
        target: "10",
        performance: "9",
        percentAchievement: "90%",
        remark: "1 client contract delayed to next week for legal signoff.",
      },
      {
        kpi: "Weekly invoicing collection velocity",
        target: "$450,000",
        performance: "$482,500",
        percentAchievement: "107%",
        remark: "Accelerated corporate disbursements received before week-end.",
      },
    ],
    incompleteRows: [
      {
        activity: "Finalize warehouse safety and environmental certification audit",
        reason:
          "Inspector visit postponed by municipal regulator; rescheduled to Tuesday next week.",
      },
    ],
    challenges:
      "Port customs clearance delays on imported spare parts. Operations team has initiated expedited pre-clearance with local shipping agents.",
    prioritiesNextWeek:
      "1. Finalize Q4 capital expenditure budget reviews with holding finance committee.\n2. Complete delayed ISO compliance inspection.\n3. Roll out standardized digital reporting across remaining regional business units.",
    supportRequired:
      "Formal executive signoff from the Holding Investment Committee for the regional distribution center lease renewal.",
  };

  // Sample Monthly Report (Reviewed & Approved by CEO with directives)
  const monthlyData = {
    statusOfDirections:
      "All three strategic directions given in the previous executive session were executed: cost center audits completed, subsidiary vendor consolidations underway, and ERP phase 2 requirements finalized.",
    executiveSummary:
      "The division achieved strong operational performance in October. Core revenue reached $2.14M (+8.2% MoM), gross margins expanded by 140 bps, and staff headcount remained stable with zero lost-time safety incidents across all subsidiary assets.",
    goalRows: [
      {
        plannedActivity: "Consolidate regional vendor supplier contracts",
        kpi: "Number of consolidated agreements",
        target: "5",
        actualPerformance: "4",
        percentage: "80%",
        remarks: "Final agreement pending vendor board approval.",
      },
      {
        plannedActivity: "Implement centralized reporting portal across subsidiaries",
        kpi: "Division onboarding rate",
        target: "100%",
        actualPerformance: "100%",
        percentage: "100%",
        remarks: "Successfully deployed and live on Neon PostgreSQL.",
      },
      {
        plannedActivity: "Reduce subsidiary transport fuel overhead",
        kpi: "Cost variance reduction (%)",
        target: "5%",
        actualPerformance: "6.2%",
        percentage: "124%",
        remarks: "New route optimization algorithm saved $28,000 in monthly fuel spend.",
      },
    ],
    additionalActivitiesPerformed:
      "Conducted emergency readiness drill across all 3 logistics facilities and finalized employee health insurance group renewal under favorable group terms.",
    activitiesPlannedNotExecuted:
      "Upgrade of subsidiary local servers postponed due to cloud migration prioritization; infrastructure scheduled for decommission in Q1 2027.",
    challengeEncountered:
      "Foreign exchange volatility affecting international equipment import lead times.",
    actionTaken:
      "Secured forward currency hedges with commercial bank partners to fix procurement costs for the next 90 days.",
    supportAndFollowUp:
      "Holding board approval required for treasury allocation regarding capital equipment procurement.",
    focusAreasNextMonth:
      "1. Execution of full FY2027 strategic budget planning.\n2. Launching digital compliance review meetings with division leadership.\n3. Delivery of final vendor consolidation cost savings report to the Board.",
  };

  await sql`
    INSERT INTO reports (user_id, report_type, period_start, period_end, status, data, review_notes, reviewed_by, reviewed_at)
    VALUES 
      (${staffId}, 'weekly', '2026-11-02', '2026-11-08', 'submitted', ${JSON.stringify(weeklyData)}, NULL, NULL, NULL),
      (${staffId}, 'monthly', '2026-10-01', '2026-10-31', 'reviewed', ${JSON.stringify(monthlyData)}, 'Reviewed and formally approved by the Office of the CEO. Exceptional turnaround on logistics turnaround times and fleet uptime. Proceed with forward currency hedges and submit the FY2027 budget proposal before the Nov 20 Board meeting.', ${ceoId}, now());
  `;

  console.log("Successfully seeded rich YETAF HOLDING sample reports into Neon!");
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
