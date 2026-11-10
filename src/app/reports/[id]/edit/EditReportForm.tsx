"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Section, Field, inputClass, textareaClass } from "@/components/FormBits";
import {
  IconArrowLeft,
  IconCheck,
  IconPlus,
  IconSave,
  IconTrash,
} from "@/components/Icons";
import {
  emptyWeeklyKpiRow,
  emptyWeeklyIncompleteRow,
  emptyMonthlyGoalRow,
  type ReportRow,
  type WeeklyReportData,
  type MonthlyReportData,
} from "@/types/report";

export function EditReportForm({ initialReport }: { initialReport: ReportRow }) {
  const router = useRouter();
  const [reportType] = useState(initialReport.report_type);
  const [periodStart, setPeriodStart] = useState(initialReport.period_start);
  const [periodEnd, setPeriodEnd] = useState(initialReport.period_end);
  const [weeklyData, setWeeklyData] = useState<WeeklyReportData>(
    initialReport.report_type === "weekly"
      ? (initialReport.data as WeeklyReportData)
      : ({} as WeeklyReportData)
  );
  const [monthlyData, setMonthlyData] = useState<MonthlyReportData>(
    initialReport.report_type === "monthly"
      ? (initialReport.data as MonthlyReportData)
      : ({} as MonthlyReportData)
  );
  const [error, setError] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState<"idle" | "draft" | "submitted">("idle");

  function updateWeekly<K extends keyof WeeklyReportData>(key: K, value: WeeklyReportData[K]) {
    setWeeklyData((d) => ({ ...d, [key]: value }));
  }

  function updateMonthly<K extends keyof MonthlyReportData>(key: K, value: MonthlyReportData[K]) {
    setMonthlyData((d) => ({ ...d, [key]: value }));
  }

  async function handleUpdate(status: "draft" | "submitted") {
    setSavingStatus(status);
    setError(null);

    const dataToSave = reportType === "weekly" ? weeklyData : monthlyData;
    const finalStart = reportType === "weekly" ? weeklyData.reportingWeekFrom : periodStart;
    const finalEnd = reportType === "weekly" ? weeklyData.reportingWeekTo : periodEnd;

    try {
      const res = await fetch(`/api/reports/${initialReport.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period_start: finalStart || initialReport.period_start,
          period_end: finalEnd || initialReport.period_end,
          status,
          data: dataToSave,
        }),
      });

      const json = await res.json();
      setSavingStatus("idle");

      if (!res.ok || !json.success) {
        setError(json.error || "Failed to update report.");
        return;
      }

      router.push(`/reports/${initialReport.id}`);
      router.refresh();
    } catch (err: unknown) {
      setSavingStatus("idle");
      setError(err instanceof Error ? err.message : "Network error");
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 pb-32">
      <div className="border-b border-border pb-6">
        <Link
          href={`/reports/${initialReport.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-1.5"
        >
          <IconArrowLeft size={14} />
          Back to Report
        </Link>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground capitalize">
          Edit {reportType} Report
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground font-mono">
          REF: YH-{initialReport.id.slice(0, 8).toUpperCase()}
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleUpdate("submitted");
        }}
        className="space-y-6"
      >
        {reportType === "weekly" ? (
          <>
            <Section number="1" title="Reporting Information">
              <div className="grid sm:grid-cols-3 gap-4">
                <Field label="Reporting Week From" required>
                  <input
                    type="date"
                    required
                    className={inputClass}
                    value={weeklyData.reportingWeekFrom || ""}
                    onChange={(e) => updateWeekly("reportingWeekFrom", e.target.value)}
                  />
                </Field>
                <Field label="Reporting Week To" required>
                  <input
                    type="date"
                    required
                    className={inputClass}
                    value={weeklyData.reportingWeekTo || ""}
                    onChange={(e) => updateWeekly("reportingWeekTo", e.target.value)}
                  />
                </Field>
                <Field label="Prepared By" required>
                  <input
                    required
                    className={inputClass}
                    value={weeklyData.preparedBy || ""}
                    onChange={(e) => updateWeekly("preparedBy", e.target.value)}
                  />
                </Field>
              </div>
            </Section>

            <Section
              number="2"
              title="Executive Summary"
              description="Brief summary of achievements, deviations, and core risks."
            >
              <Field label="High-Level Summary Points">
                <textarea
                  rows={4}
                  className={textareaClass}
                  value={weeklyData.executiveSummary || ""}
                  onChange={(e) => updateWeekly("executiveSummary", e.target.value)}
                />
              </Field>
            </Section>

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
                    {weeklyData.kpiRows?.map((row, i) => (
                      <tr key={i} className="align-top hover:bg-muted/30 transition-colors">
                        <td className="p-3 text-center font-mono text-muted-foreground text-xs">
                          {i + 1}
                        </td>
                        <td className="p-2.5">
                          <input
                            className={inputClass}
                            value={row.kpi}
                            onChange={(e) =>
                              updateWeekly(
                                "kpiRows",
                                weeklyData.kpiRows.map((r, j) =>
                                  j === i ? { ...r, kpi: e.target.value } : r
                                )
                              )
                            }
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            className={inputClass}
                            value={row.target}
                            onChange={(e) =>
                              updateWeekly(
                                "kpiRows",
                                weeklyData.kpiRows.map((r, j) =>
                                  j === i ? { ...r, target: e.target.value } : r
                                )
                              )
                            }
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            className={inputClass}
                            value={row.performance}
                            onChange={(e) =>
                              updateWeekly(
                                "kpiRows",
                                weeklyData.kpiRows.map((r, j) =>
                                  j === i ? { ...r, performance: e.target.value } : r
                                )
                              )
                            }
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            className={inputClass}
                            value={row.percentAchievement}
                            onChange={(e) =>
                              updateWeekly(
                                "kpiRows",
                                weeklyData.kpiRows.map((r, j) =>
                                  j === i ? { ...r, percentAchievement: e.target.value } : r
                                )
                              )
                            }
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            className={inputClass}
                            value={row.remark}
                            onChange={(e) =>
                              updateWeekly(
                                "kpiRows",
                                weeklyData.kpiRows.map((r, j) =>
                                  j === i ? { ...r, remark: e.target.value } : r
                                )
                              )
                            }
                          />
                        </td>
                        <td className="p-2.5 text-center">
                          {weeklyData.kpiRows.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                updateWeekly(
                                  "kpiRows",
                                  weeklyData.kpiRows.filter((_, j) => j !== i)
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
                  updateWeekly("kpiRows", [
                    ...(weeklyData.kpiRows || []),
                    emptyWeeklyKpiRow(),
                  ])
                }
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-2xs"
              >
                <IconPlus size={13} className="text-muted-foreground" />
                Add KPI Row
              </button>
            </Section>

            <Section
              number="4"
              title="Incomplete Planned Activities & Critical Variance Analysis"
              description="Activities planned but not concluded in the reporting period."
            >
              <div className="overflow-x-auto rounded-xl border border-border bg-card">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-muted/60 text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-3 py-3 w-12 text-center">No.</th>
                      <th className="px-4 py-3 min-w-[240px]">Incomplete Activity</th>
                      <th className="px-4 py-3 min-w-[320px]">
                        Reason for Delay / Deviation (impact &amp; revised ETA)
                      </th>
                      <th className="w-10 px-2 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {weeklyData.incompleteRows?.map((row, i) => (
                      <tr key={i} className="align-top hover:bg-muted/30 transition-colors">
                        <td className="p-3 text-center font-mono text-muted-foreground text-xs">
                          {i + 1}
                        </td>
                        <td className="p-2.5">
                          <input
                            className={inputClass}
                            value={row.activity}
                            onChange={(e) =>
                              updateWeekly(
                                "incompleteRows",
                                weeklyData.incompleteRows.map((r, j) =>
                                  j === i ? { ...r, activity: e.target.value } : r
                                )
                              )
                            }
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            className={inputClass}
                            value={row.reason}
                            onChange={(e) =>
                              updateWeekly(
                                "incompleteRows",
                                weeklyData.incompleteRows.map((r, j) =>
                                  j === i ? { ...r, reason: e.target.value } : r
                                )
                              )
                            }
                          />
                        </td>
                        <td className="p-2.5 text-center">
                          {weeklyData.incompleteRows.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                updateWeekly(
                                  "incompleteRows",
                                  weeklyData.incompleteRows.filter((_, j) => j !== i)
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
                  updateWeekly("incompleteRows", [
                    ...(weeklyData.incompleteRows || []),
                    emptyWeeklyIncompleteRow(),
                  ])
                }
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-2xs"
              >
                <IconPlus size={13} className="text-muted-foreground" />
                Add Incomplete Activity Row
              </button>
            </Section>

            <Section
              number="5"
              title="Key Challenges, Risks & Proposed Mitigations"
              description="Detail key challenges and specific actions taken or underway to resolve them."
            >
              <textarea
                rows={3}
                className={textareaClass}
                value={weeklyData.challenges || ""}
                onChange={(e) => updateWeekly("challenges", e.target.value)}
              />
            </Section>

            <Section
              number="6"
              title="Priorities for the Coming Week"
              description="The primary milestones your division intends to achieve in the next cycle."
            >
              <textarea
                rows={3}
                className={textareaClass}
                value={weeklyData.prioritiesNextWeek || ""}
                onChange={(e) => updateWeekly("prioritiesNextWeek", e.target.value)}
              />
            </Section>

            <Section
              number="7"
              title="Support or Decisions Required from the Holding"
              description="Explicitly escalate governance approvals, budget releases, or inter-subsidiary cooperation."
            >
              <textarea
                rows={3}
                className={textareaClass}
                value={weeklyData.supportRequired || ""}
                onChange={(e) => updateWeekly("supportRequired", e.target.value)}
              />
            </Section>
          </>
        ) : (
          <>
            <Section number="·" title="Reporting Period">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Period Start" required>
                  <input
                    type="date"
                    required
                    className={inputClass}
                    value={periodStart || ""}
                    onChange={(e) => setPeriodStart(e.target.value)}
                  />
                </Field>
                <Field label="Period End" required>
                  <input
                    type="date"
                    required
                    className={inputClass}
                    value={periodEnd || ""}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                  />
                </Field>
              </div>
            </Section>

            <Section
              number="1"
              title="Status of Management Directions Given in the last reporting section"
              description="Status of previous directions given by Yetaf Holding executives in the prior reporting section."
            >
              <textarea
                rows={3}
                className={textareaClass}
                value={monthlyData.statusOfDirections || ""}
                onChange={(e) => updateMonthly("statusOfDirections", e.target.value)}
              />
            </Section>

            <Section
              number="2"
              title="Executive summary"
              description="High-level monthly performance summary and strategic achievements."
            >
              <textarea
                rows={4}
                className={textareaClass}
                value={monthlyData.executiveSummary || ""}
                onChange={(e) => updateMonthly("executiveSummary", e.target.value)}
              />
            </Section>

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
                    {monthlyData.goalRows?.map((row, i) => (
                      <tr key={i} className="align-top hover:bg-muted/30 transition-colors">
                        <td className="p-3 text-center font-mono text-muted-foreground text-xs">
                          {i + 1}
                        </td>
                        <td className="p-2.5">
                          <input
                            className={inputClass}
                            value={row.plannedActivity}
                            onChange={(e) =>
                              updateMonthly(
                                "goalRows",
                                monthlyData.goalRows.map((r, j) =>
                                  j === i ? { ...r, plannedActivity: e.target.value } : r
                                )
                              )
                            }
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            className={inputClass}
                            value={row.kpi}
                            onChange={(e) =>
                              updateMonthly(
                                "goalRows",
                                monthlyData.goalRows.map((r, j) =>
                                  j === i ? { ...r, kpi: e.target.value } : r
                                )
                              )
                            }
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            className={inputClass}
                            value={row.target}
                            onChange={(e) =>
                              updateMonthly(
                                "goalRows",
                                monthlyData.goalRows.map((r, j) =>
                                  j === i ? { ...r, target: e.target.value } : r
                                )
                              )
                            }
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            className={inputClass}
                            value={row.actualPerformance}
                            onChange={(e) =>
                              updateMonthly(
                                "goalRows",
                                monthlyData.goalRows.map((r, j) =>
                                  j === i ? { ...r, actualPerformance: e.target.value } : r
                                )
                              )
                            }
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            className={inputClass}
                            value={row.percentage}
                            onChange={(e) =>
                              updateMonthly(
                                "goalRows",
                                monthlyData.goalRows.map((r, j) =>
                                  j === i ? { ...r, percentage: e.target.value } : r
                                )
                              )
                            }
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            className={inputClass}
                            value={row.remarks}
                            onChange={(e) =>
                              updateMonthly(
                                "goalRows",
                                monthlyData.goalRows.map((r, j) =>
                                  j === i ? { ...r, remarks: e.target.value } : r
                                )
                              )
                            }
                          />
                        </td>
                        <td className="p-2.5 text-center">
                          {monthlyData.goalRows.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                updateMonthly(
                                  "goalRows",
                                  monthlyData.goalRows.filter((_, j) => j !== i)
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
                  updateMonthly("goalRows", [
                    ...(monthlyData.goalRows || []),
                    emptyMonthlyGoalRow(),
                  ])
                }
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-2xs"
              >
                <IconPlus size={13} className="text-muted-foreground" />
                Add Goal Row
              </button>
            </Section>

            <Section
              number="4"
              title="Additional Activities Completed and Planned Activities Not Executed"
              description="Record unplanned tasks executed and planned initiatives deferred."
            >
              <div className="space-y-4">
                <Field label="Additional Activities Performed">
                  <textarea
                    rows={3}
                    className={textareaClass}
                    value={monthlyData.additionalActivitiesPerformed || ""}
                    onChange={(e) =>
                      updateMonthly("additionalActivitiesPerformed", e.target.value)
                    }
                  />
                </Field>
                <Field label="Activities Planned But Not Executed">
                  <textarea
                    rows={3}
                    className={textareaClass}
                    value={monthlyData.activitiesPlannedNotExecuted || ""}
                    onChange={(e) =>
                      updateMonthly("activitiesPlannedNotExecuted", e.target.value)
                    }
                  />
                </Field>
              </div>
            </Section>

            <Section
              number="5"
              title="Challenges And Action Taken to Overcome the Challenge"
              description="Document operational obstacles and corrective actions."
            >
              <div className="space-y-4">
                <Field label="Challenge Encountered">
                  <textarea
                    rows={3}
                    className={textareaClass}
                    value={monthlyData.challengeEncountered || ""}
                    onChange={(e) =>
                      updateMonthly("challengeEncountered", e.target.value)
                    }
                  />
                </Field>
                <Field label="Action Taken to Solve / Address the Challenge">
                  <textarea
                    rows={3}
                    className={textareaClass}
                    value={monthlyData.actionTaken || ""}
                    onChange={(e) => updateMonthly("actionTaken", e.target.value)}
                  />
                </Field>
              </div>
            </Section>

            <Section
              number="6"
              title="Follow-up, Support, and Evaluation Activities Conducted"
              description="Monitoring sessions, steering touchpoints, and evaluations performed."
            >
              <textarea
                rows={3}
                className={textareaClass}
                value={monthlyData.supportAndFollowUp || ""}
                onChange={(e) => updateMonthly("supportAndFollowUp", e.target.value)}
              />
            </Section>

            <Section
              number="7"
              title="Performance Focus Areas for Next Month"
              description="Core strategic focus areas and priority targets for the subsequent period."
            >
              <textarea
                rows={3}
                className={textareaClass}
                value={monthlyData.focusAreasNextMonth || ""}
                onChange={(e) => updateMonthly("focusAreasNextMonth", e.target.value)}
              />
            </Section>
          </>
        )}

        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-medium text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        {/* Sticky action bar */}
        <div className="sticky bottom-6 z-20 flex items-center justify-between rounded-xl border border-border bg-card/95 p-4 shadow-xl backdrop-blur-md">
          <div className="text-xs text-muted-foreground hidden sm:block">
            Update report content or switch status to submit directly to executive review.
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => handleUpdate("draft")}
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
              {savingStatus === "submitted" ? "Updating..." : "Update & Submit to Management"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
