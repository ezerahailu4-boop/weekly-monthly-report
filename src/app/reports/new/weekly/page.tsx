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
  emptyWeeklyReport,
  emptyWeeklyKpiRow,
  emptyWeeklyIncompleteRow,
  type WeeklyReportData,
} from "@/types/report";

export default function NewWeeklyReportPage() {
  const router = useRouter();
  const [data, setData] = useState<WeeklyReportData>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("yetta_weekly_draft");
        if (cached) {
          return { ...emptyWeeklyReport(), ...JSON.parse(cached) };
        }
      } catch {
        // ignore
      }
    }
    return emptyWeeklyReport();
  });
  const [error, setError] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState<"idle" | "draft" | "submitted">("idle");
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  function update<K extends keyof WeeklyReportData>(key: K, value: WeeklyReportData[K]) {
    setData((d) => {
      const next = { ...d, [key]: value };
      try {
        localStorage.setItem("yetta_weekly_draft", JSON.stringify(next));
        setLastSaved(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      } catch {
        // ignore
      }
      return next;
    });
  }

  // Auto-calculate % achievement if target and performance are numeric
  function handleKpiChange(index: number, field: "target" | "performance", val: string) {
    const nextRows = data.kpiRows.map((r, i) => {
      if (i !== index) return r;
      const updated = { ...r, [field]: val };
      const targetNum = parseFloat(updated.target);
      const perfNum = parseFloat(updated.performance);
      if (!isNaN(targetNum) && !isNaN(perfNum) && targetNum > 0) {
        updated.percentAchievement = `${Math.round((perfNum / targetNum) * 100)}%`;
      }
      return updated;
    });
    update("kpiRows", nextRows);
  }

  async function handleSave(status: "draft" | "submitted") {
    setSavingStatus(status);
    setError(null);

    if (status === "submitted" && (!data.reportingWeekFrom || !data.reportingWeekTo)) {
      setError("Please specify the reporting week dates (From and To).");
      setSavingStatus("idle");
      return;
    }

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_type: "weekly",
          period_start: data.reportingWeekFrom || new Date().toISOString().slice(0, 10),
          period_end: data.reportingWeekTo || new Date().toISOString().slice(0, 10),
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
        localStorage.removeItem("yetta_weekly_draft");
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

  function loadSampleWeeklyData() {
    const today = new Date();
    const lastWeek = new Date(Date.now() - 6 * 86400000);
    const sample: WeeklyReportData = {
      reportingWeekFrom: lastWeek.toISOString().slice(0, 10),
      reportingWeekTo: today.toISOString().slice(0, 10),
      preparedBy: "Operations Department Lead",
      executiveSummary:
        "1. Completed Q4 distribution logistics turnaround 1.5 days ahead of schedule.\n2. Subsidiary fleet uptime reached 98.4%, exceeding the 95% target.\n3. Fuel price volatility continues to require active freight indexing and board tariff review.",
      kpiRows: [
        {
          kpi: "Subsidiary fleet operational uptime",
          target: "95%",
          performance: "98.4%",
          percentAchievement: "104%",
          remark: "Exceeded target through preventative weekend maintenance schedule.",
        },
        {
          kpi: "Key commercial contract renewals",
          target: "10",
          performance: "9",
          percentAchievement: "90%",
          remark: "1 agreement awaiting final legal review next Monday.",
        },
        {
          kpi: "Weekly corporate collection velocity",
          target: "$450,000",
          performance: "$480,000",
          percentAchievement: "107%",
          remark: "Early payments received from two primary corporate accounts.",
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
    setData(sample);
    try {
      localStorage.setItem("yetta_weekly_draft", JSON.stringify(sample));
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
            New Weekly Performance Report
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Follows the official YETAF HOLDING 7-section operational performance reporting format.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={loadSampleWeeklyData}
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
        {/* Section 1 */}
        <Section
          number="1"
          title="Reporting Information"
          description="Identify the reporting window and responsible author."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Reporting Week From" required hint="Start Date">
              <input
                type="date"
                required
                className={inputClass}
                value={data.reportingWeekFrom}
                onChange={(e) => update("reportingWeekFrom", e.target.value)}
              />
            </Field>
            <Field label="Reporting Week To" required hint="End Date">
              <input
                type="date"
                required
                className={inputClass}
                value={data.reportingWeekTo}
                onChange={(e) => update("reportingWeekTo", e.target.value)}
              />
            </Field>
            <Field label="Prepared By" required hint="Full Name & Title">
              <input
                required
                placeholder="e.g. Operations Department Lead"
                className={inputClass}
                value={data.preparedBy}
                onChange={(e) => update("preparedBy", e.target.value)}
              />
            </Field>
          </div>
        </Section>

        {/* Section 2 */}
        <Section
          number="2"
          title="Executive Summary (complete in 3–5 short points)"
          description="Briefly state the most important results, major deviations from plan, key risks, and decisions or support required from management."
        >
          <Field label="High-Level Summary Points">
            <textarea
              rows={4}
              placeholder="Briefly state the most important results, major deviations from plan, key risks, and decisions or support required from management (3–5 short sentences)..."
              className={textareaClass}
              value={data.executiveSummary}
              onChange={(e) => update("executiveSummary", e.target.value)}
            />
          </Field>
        </Section>

        {/* Section 3 */}
        <Section
          number="3"
          title="Weekly KPI and Activity Performance"
          description="The most important planned activities and KPIs only. Use consistent units and definitions from week to week. Explain material variances in the remark's column."
        >
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-left text-xs tabular-nums">
              <thead className="border-b border-border bg-muted/60 text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-3 py-3 w-12 text-center">No.</th>
                  <th className="px-4 py-3 min-w-[200px]">KPI / planned activity</th>
                  <th className="px-4 py-3 min-w-[110px]">Weekly target</th>
                  <th className="px-4 py-3 min-w-[110px]">Performance</th>
                  <th className="px-4 py-3 min-w-[110px]">% Achievement</th>
                  <th className="px-4 py-3 min-w-[160px]">Remark</th>
                  <th className="w-10 px-2 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {data.kpiRows.map((row, i) => (
                  <tr key={i} className="align-top hover:bg-muted/30 transition-colors">
                    <td className="p-3 text-center font-mono text-muted-foreground text-xs">
                      {i + 1}
                    </td>
                    <td className="p-2.5">
                      <input
                        placeholder="e.g. Subsidiary fleet operational uptime"
                        className={inputClass}
                        value={row.kpi}
                        onChange={(e) =>
                          update(
                            "kpiRows",
                            data.kpiRows.map((r, j) =>
                              j === i ? { ...r, kpi: e.target.value } : r
                            )
                          )
                        }
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        placeholder="e.g. 95%"
                        className={inputClass}
                        value={row.target}
                        onChange={(e) => handleKpiChange(i, "target", e.target.value)}
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        placeholder="e.g. 98.4%"
                        className={inputClass}
                        value={row.performance}
                        onChange={(e) => handleKpiChange(i, "performance", e.target.value)}
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        placeholder="e.g. 104%"
                        className={inputClass}
                        value={row.percentAchievement}
                        onChange={(e) =>
                          update(
                            "kpiRows",
                            data.kpiRows.map((r, j) =>
                              j === i ? { ...r, percentAchievement: e.target.value } : r
                            )
                          )
                        }
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        placeholder="Optional context"
                        className={inputClass}
                        value={row.remark}
                        onChange={(e) =>
                          update(
                            "kpiRows",
                            data.kpiRows.map((r, j) =>
                              j === i ? { ...r, remark: e.target.value } : r
                            )
                          )
                        }
                      />
                    </td>
                    <td className="p-2.5 text-center">
                      {data.kpiRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            update(
                              "kpiRows",
                              data.kpiRows.filter((_, j) => j !== i)
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
            onClick={() => update("kpiRows", [...data.kpiRows, emptyWeeklyKpiRow()])}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-2xs"
          >
            <IconPlus size={13} className="text-muted-foreground" />
            Add KPI Row
          </button>
        </Section>

        {/* Section 4 */}
        <Section
          number="4"
          title="Incomplete Planned Activities & Critical Variance Analysis"
          description="Every activity that was planned for the week but not completed as intended. Be candid and concise."
        >
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/60 text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-3 py-3 w-12 text-center">No.</th>
                  <th className="px-4 py-3 min-w-[240px]">Incomplete Activity</th>
                  <th className="px-4 py-3 min-w-[320px]">
                    Reason for Delay / Deviation (include impact &amp; revised deadline)
                  </th>
                  <th className="w-10 px-2 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {data.incompleteRows.map((row, i) => (
                  <tr key={i} className="align-top hover:bg-muted/30 transition-colors">
                    <td className="p-3 text-center font-mono text-muted-foreground text-xs">
                      {i + 1}
                    </td>
                    <td className="p-2.5">
                      <input
                        placeholder="e.g. Finalize ISO audit"
                        className={inputClass}
                        value={row.activity}
                        onChange={(e) =>
                          update(
                            "incompleteRows",
                            data.incompleteRows.map((r, j) =>
                              j === i ? { ...r, activity: e.target.value } : r
                            )
                          )
                        }
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        placeholder="Reason for deviation, corrective action, revised ETA..."
                        className={inputClass}
                        value={row.reason}
                        onChange={(e) =>
                          update(
                            "incompleteRows",
                            data.incompleteRows.map((r, j) =>
                              j === i ? { ...r, reason: e.target.value } : r
                            )
                          )
                        }
                      />
                    </td>
                    <td className="p-2.5 text-center">
                      {data.incompleteRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            update(
                              "incompleteRows",
                              data.incompleteRows.filter((_, j) => j !== i)
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
            onClick={() =>
              update("incompleteRows", [...data.incompleteRows, emptyWeeklyIncompleteRow()])
            }
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-2xs"
          >
            <IconPlus size={13} className="text-muted-foreground" />
            Add Incomplete Activity Row
          </button>
        </Section>

        {/* Section 5 */}
        <Section
          number="5"
          title="Key Challenges, Risks & Proposed Mitigations"
          description="Identify operational, market, regulatory, or technical impediments that require attention."
        >
          <textarea
            rows={3}
            placeholder="Describe key risks and what mitigations your department is putting in place..."
            className={textareaClass}
            value={data.challenges}
            onChange={(e) => update("challenges", e.target.value)}
          />
        </Section>

        {/* Section 6 */}
        <Section
          number="6"
          title="Priorities for the Coming Week"
          description="The primary milestones your division intends to achieve in the next cycle."
        >
          <textarea
            rows={3}
            placeholder="Outline top 3 to 5 deliverables for next week..."
            className={textareaClass}
            value={data.prioritiesNextWeek}
            onChange={(e) => update("prioritiesNextWeek", e.target.value)}
          />
        </Section>

        {/* Section 7 */}
        <Section
          number="7"
          title="Support or Decisions Required from the Holding"
          description="Explicitly escalate governance approvals, budget releases, or inter-subsidiary cooperation."
        >
          <textarea
            rows={3}
            placeholder="Decisions or resource allocation needed from executive leadership..."
            className={textareaClass}
            value={data.supportRequired}
            onChange={(e) => update("supportRequired", e.target.value)}
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
