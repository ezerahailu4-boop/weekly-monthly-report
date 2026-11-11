"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Section, Field, inputClass, textareaClass } from "@/components/FormBits";
import {
  IconArrowLeft,
  IconCheck,
  IconClock,
  IconFileText,
  IconPlus,
  IconSave,
  IconTrash,
} from "@/components/Icons";
import {
  emptyMonthlyReport,
  emptyMonthlyGoalRow,
  type MonthlyReportData,
} from "@/types/report";

export default function NewMonthlyReportPage() {
  const router = useRouter();
  const [periodStart, setPeriodStart] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("yetta_monthly_draft");
        if (cached) return JSON.parse(cached).periodStart || "";
      } catch {
        // ignore
      }
    }
    return "";
  });
  const [periodEnd, setPeriodEnd] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("yetta_monthly_draft");
        if (cached) return JSON.parse(cached).periodEnd || "";
      } catch {
        // ignore
      }
    }
    return "";
  });
  const [data, setData] = useState<MonthlyReportData>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("yetta_monthly_draft");
        if (cached) return { ...emptyMonthlyReport(), ...(JSON.parse(cached).data || {}) };
      } catch {
        // ignore
      }
    }
    return emptyMonthlyReport();
  });
  const [error, setError] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState<"idle" | "draft" | "submitted">("idle");
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  function update<K extends keyof MonthlyReportData>(key: K, value: MonthlyReportData[K]) {
    setData((d) => {
      const next = { ...d, [key]: value };
      try {
        localStorage.setItem(
          "yetta_monthly_draft",
          JSON.stringify({ data: next, periodStart, periodEnd })
        );
        setLastSaved(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      } catch {
        // ignore
      }
      return next;
    });
  }

  // Auto-calculate % achievement if target and actualPerformance are numeric
  function handleGoalChange(index: number, field: "target" | "actualPerformance", val: string) {
    const nextRows = data.goalRows.map((r, i) => {
      if (i !== index) return r;
      const updated = { ...r, [field]: val };
      const targetNum = parseFloat(updated.target);
      const perfNum = parseFloat(updated.actualPerformance);
      if (!isNaN(targetNum) && !isNaN(perfNum) && targetNum > 0) {
        updated.percentage = `${Math.round((perfNum / targetNum) * 100)}%`;
      }
      return updated;
    });
    update("goalRows", nextRows);
  }

  async function handleSave(status: "draft" | "submitted") {
    setSavingStatus(status);
    setError(null);

    if (status === "submitted" && (!periodStart || !periodEnd)) {
      setError("Please specify the reporting period dates (From and To).");
      setSavingStatus("idle");
      return;
    }

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_type: "monthly",
          period_start: periodStart || new Date().toISOString().slice(0, 10),
          period_end: periodEnd || new Date().toISOString().slice(0, 10),
          status,
          data,
        }),
      });

      const json = await res.json();
      setSavingStatus("idle");

      if (!res.ok || !json.success) {
        setError(json.error || "Failed to save report.");
        return;
      }

      // Clear local storage draft
      try {
        localStorage.removeItem("yetta_monthly_draft");
      } catch {
        // ignore
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      setSavingStatus("idle");
      setError(err instanceof Error ? err.message : "Network error");
    }
  }

  function loadSampleMonthlyData() {
    const today = new Date();
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startStr = firstOfMonth.toISOString().slice(0, 10);
    const endStr = today.toISOString().slice(0, 10);

    setPeriodStart(startStr);
    setPeriodEnd(endStr);

    const sample: MonthlyReportData = {
      statusOfDirections:
        "1. Executive Committee mandated restructuring of subsidiary warehousing logistics: 100% completed with revised operational SLAs.\n2. Treasury requirement to hedge FX exposure: Treasury committee approved hedging policy on October 14th.\n3. IT security posture hardening: Multi-factor authentication rolled out to 100% of corporate accounts.",
      executiveSummary:
        "During the reporting month, the division sustained strong operational momentum, recording an aggregate throughput growth of 14.2% month-on-month. Capital expenditures remained within the approved Q4 allocation at 92% budget utilization. Strategic vendor agreements were consolidated, delivering annualized operational savings of approximately $340,000 across holding entities.",
      goalRows: [
        {
          plannedActivity: "Consolidate regional supply chain contracts",
          kpi: "Signed Master Service Agreements",
          target: "5",
          actualPerformance: "5",
          percentage: "100%",
          remarks: "Successfully executed with Tier-1 freight partners.",
        },
        {
          plannedActivity: "Subsidiary enterprise resource planning (ERP) rollout",
          kpi: "Core finance modules deployed",
          target: "3 entities",
          actualPerformance: "2 entities",
          percentage: "67%",
          remarks: "Final entity data migration scheduled for completion mid next month.",
        },
        {
          plannedActivity: "Working capital optimization program",
          kpi: "Days Sales Outstanding (DSO)",
          target: "42 days",
          actualPerformance: "38 days",
          percentage: "110%",
          remarks: "DSO reduced by 4 days via automated invoice follow-up workflows.",
        },
      ],
      additionalActivitiesPerformed:
        "1. Completed emergency generator fuel reserve upgrade at Central Hub.\n2. Conducted cross-functional health and safety refresher training for 45 logistics supervisors.",
      activitiesPlannedNotExecuted:
        "1. Implementation of secondary warehouse barcode scanning system: Vendor hardware shipment delayed by 10 days; now rescheduled for early next month.",
      challengeEncountered:
        "Port customs clearance lead times increased due to new maritime documentation requirements.",
      actionTaken:
        "Engaged certified freight clearing agent on retainer and instituted 48-hour pre-manifest lodgment.",
      supportAndFollowUp:
        "Conducted bi-weekly performance tracking sessions with subsidiary department heads and monitored fuel consumption variance weekly.",
      focusAreasNextMonth:
        "1. Finalize ERP rollout across remaining subsidiaries.\n2. Conclude annual supplier contract renegotiations to secure bulk purchasing discounts.\n3. Present FY2027 capital expenditure request to the Board of Directors.",
    };

    setData(sample);
    try {
      localStorage.setItem(
        "yetta_monthly_draft",
        JSON.stringify({ data: sample, periodStart: startStr, periodEnd: endStr })
      );
    } catch {
      // ignore
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 pb-32">
      {/* Navigation & Header */}
      <div className="border-b border-border pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-1.5"
          >
            <IconArrowLeft size={14} />
            Back to Dashboard
          </Link>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Monthly Progress Report
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Comprehensive monthly progress and governance report matching the official Yetaf Holding template.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={loadSampleMonthlyData}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-2xs"
            title="Populate form with official sample data"
          >
            <IconFileText size={13} className="text-muted-foreground" />
            Fill Sample Template
          </button>

          {lastSaved && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted px-2.5 py-1 rounded-full border border-border">
              <IconClock size={12} className="text-accent" />
              Saved at {lastSaved}
            </span>
          )}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSave("submitted");
        }}
        className="space-y-6"
      >
        {/* Section: Reporting Period */}
        <Section
          number="·"
          title="Monthly Reporting Period"
          description="Specify the monthly reporting cycle window."
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Period Start" required>
              <input
                type="date"
                required
                className={inputClass}
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </Field>
            <Field label="Period End" required>
              <input
                type="date"
                required
                className={inputClass}
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </Field>
          </div>
        </Section>

        {/* Section 1 */}
        <Section
          number="1"
          title="Status of Management Directions Given in the last reporting section"
          description="Status of previous directions given by Yetaf Holding executives in the prior reporting section."
        >
          <textarea
            rows={3}
            placeholder="State previous directives received and their execution status..."
            className={textareaClass}
            value={data.statusOfDirections}
            onChange={(e) => update("statusOfDirections", e.target.value)}
          />
        </Section>

        {/* Section 2 */}
        <Section
          number="2"
          title="Executive summary"
          description="High-level monthly performance summary and strategic achievements."
        >
          <textarea
            rows={4}
            placeholder="Concise overview of month's operational performance..."
            className={textareaClass}
            value={data.executiveSummary}
            onChange={(e) => update("executiveSummary", e.target.value)}
          />
        </Section>

        {/* Section 3 */}
        <Section
          number="3"
          title="Goals and planned activities Performance"
          description="Strategic activity breakdown with milestone percentage completion."
        >
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-left text-xs tabular-nums">
              <thead className="border-b border-border bg-muted/60 text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-3 py-3 w-12 text-center">S/N</th>
                  <th className="px-4 py-3 min-w-[180px]">Planned activities</th>
                  <th className="px-4 py-3 min-w-[140px]">KPI</th>
                  <th className="px-4 py-3 min-w-[100px]">Target</th>
                  <th className="px-4 py-3 min-w-[110px]">Actual Performance</th>
                  <th className="px-4 py-3 min-w-[90px]">Percentage</th>
                  <th className="px-4 py-3 min-w-[160px]">Remarks</th>
                  <th className="w-10 px-2 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {data.goalRows.map((row, i) => (
                  <tr key={i} className="align-top hover:bg-muted/30 transition-colors">
                    <td className="p-3 text-center font-mono text-muted-foreground text-xs">
                      {i + 1}
                    </td>
                    <td className="p-2.5">
                      <input
                        placeholder="e.g. Implement ERP phase 1"
                        className={inputClass}
                        value={row.plannedActivity}
                        onChange={(e) =>
                          update(
                            "goalRows",
                            data.goalRows.map((r, j) =>
                              j === i ? { ...r, plannedActivity: e.target.value } : r
                            )
                          )
                        }
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        placeholder="e.g. Modules deployed"
                        className={inputClass}
                        value={row.kpi}
                        onChange={(e) =>
                          update(
                            "goalRows",
                            data.goalRows.map((r, j) =>
                              j === i ? { ...r, kpi: e.target.value } : r
                            )
                          )
                        }
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        placeholder="e.g. 3"
                        className={inputClass}
                        value={row.target}
                        onChange={(e) => handleGoalChange(i, "target", e.target.value)}
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        placeholder="e.g. 2"
                        className={inputClass}
                        value={row.actualPerformance}
                        onChange={(e) =>
                          handleGoalChange(i, "actualPerformance", e.target.value)
                        }
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        placeholder="e.g. 67%"
                        className={inputClass}
                        value={row.percentage}
                        onChange={(e) =>
                          update(
                            "goalRows",
                            data.goalRows.map((r, j) =>
                              j === i ? { ...r, percentage: e.target.value } : r
                            )
                          )
                        }
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        placeholder="Context or notes"
                        className={inputClass}
                        value={row.remarks}
                        onChange={(e) =>
                          update(
                            "goalRows",
                            data.goalRows.map((r, j) =>
                              j === i ? { ...r, remarks: e.target.value } : r
                            )
                          )
                        }
                      />
                    </td>
                    <td className="p-2.5 text-center">
                      {data.goalRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            update(
                              "goalRows",
                              data.goalRows.filter((_, j) => j !== i)
                            )
                          }
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
                          title="Remove row"
                        >
                          <IconTrash size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={() => update("goalRows", [...data.goalRows, emptyMonthlyGoalRow()])}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-2xs"
          >
            <IconPlus size={13} className="text-muted-foreground" />
            Add Goal Row
          </button>
        </Section>

        {/* Section 4 */}
        <Section
          number="4"
          title="Additional Activities Completed and Planned Activities Not Executed"
          description="Record unplanned tasks executed and planned initiatives deferred."
        >
          <div className="space-y-4">
            <Field label="Additional Activities Performed">
              <textarea
                rows={3}
                placeholder="Unplanned activities completed during the month..."
                className={textareaClass}
                value={data.additionalActivitiesPerformed}
                onChange={(e) => update("additionalActivitiesPerformed", e.target.value)}
              />
            </Field>

            <Field label="Activities Planned But Not Executed">
              <textarea
                rows={3}
                placeholder="Activities planned that were postponed or deferred..."
                className={textareaClass}
                value={data.activitiesPlannedNotExecuted}
                onChange={(e) => update("activitiesPlannedNotExecuted", e.target.value)}
              />
            </Field>
          </div>
        </Section>

        {/* Section 5 */}
        <Section
          number="5"
          title="Challenges And Action Taken to Overcome the Challenge"
          description="Document operational obstacles and corrective actions."
        >
          <div className="space-y-4">
            <Field label="Challenge Encountered">
              <textarea
                rows={3}
                placeholder="Describe hurdles or constraints faced during the month..."
                className={textareaClass}
                value={data.challengeEncountered}
                onChange={(e) => update("challengeEncountered", e.target.value)}
              />
            </Field>

            <Field label="Action Taken to Solve / Address the Challenge">
              <textarea
                rows={3}
                placeholder="Mitigations implemented or underway..."
                className={textareaClass}
                value={data.actionTaken}
                onChange={(e) => update("actionTaken", e.target.value)}
              />
            </Field>
          </div>
        </Section>

        {/* Section 6 */}
        <Section
          number="6"
          title="Follow-up, Support, and Evaluation Activities Conducted"
          description="Monitoring sessions, steering touchpoints, and evaluations performed."
        >
          <textarea
            rows={3}
            placeholder="Support provided, supervisory visits, audits, or performance evaluations..."
            className={textareaClass}
            value={data.supportAndFollowUp}
            onChange={(e) => update("supportAndFollowUp", e.target.value)}
          />
        </Section>

        {/* Section 7 */}
        <Section
          number="7"
          title="Performance Focus Areas for Next Month"
          description="Core strategic focus areas and priority targets for the subsequent period."
        >
          <textarea
            rows={3}
            placeholder="Top 3 to 5 deliverables for next month..."
            className={textareaClass}
            value={data.focusAreasNextMonth}
            onChange={(e) => update("focusAreasNextMonth", e.target.value)}
          />
        </Section>

        {/* Error display */}
        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-medium text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        {/* Sticky Bottom Action Bar */}
        <div className="sticky bottom-6 z-20 flex items-center justify-between rounded-xl border border-border bg-card/95 p-4 shadow-xl backdrop-blur-md">
          <div className="text-xs text-muted-foreground hidden sm:block">
            Drafts remain private. Submitting sends this report directly to the Admin and CEO review queues.
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => handleSave("draft")}
              disabled={savingStatus !== "idle"}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted shadow-2xs transition-colors disabled:opacity-50"
            >
              <IconSave size={14} className="text-muted-foreground" />
              {savingStatus === "draft" ? "Saving Draft..." : "Save as Draft"}
            </button>

            <button
              type="submit"
              disabled={savingStatus !== "idle"}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground shadow-xs hover:opacity-90 transition-all disabled:opacity-50"
            >
              <IconCheck size={14} className="text-emerald-400" />
              {savingStatus === "submitted"
                ? "Submitting to Leadership..."
                : "Submit to Management (Send to Admin & CEO)"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
