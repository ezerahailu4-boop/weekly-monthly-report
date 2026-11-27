"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconCheckCircle, IconMessageSquare, IconSave, IconX } from "./Icons";
import type { ActionPlanObjective, ActionPlanRow, ActionPlanStatus } from "@/types/plan";

export function PlanDetailInteractive({
  initialPlan,
  canEdit,
  isPrivileged,
}: {
  initialPlan: ActionPlanRow;
  canEdit: boolean;
  isPrivileged: boolean;
}) {
  const router = useRouter();
  const [plan, setPlan] = useState<ActionPlanRow>(initialPlan);
  const [objectives, setObjectives] = useState<ActionPlanObjective[]>(
    Array.isArray(initialPlan.objectives) ? initialPlan.objectives : []
  );
  const [reviewNotes, setReviewNotes] = useState(initialPlan.review_notes || "");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function saveUpdate(payload: Record<string, unknown>, okMsg: string) {
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/plans/${plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setNotice({ type: "err", text: data.error || "Update failed." });
      } else {
        setPlan(data.plan);
        setNotice({ type: "ok", text: okMsg });
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {notice && (
        <div
          className={`rounded-xl border p-3.5 text-xs font-medium flex items-center justify-between ${
            notice.type === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-brand"
              : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
          }`}
        >
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} className="cursor-pointer">
            <IconX size={14} />
          </button>
        </div>
      )}

      {/* Milestones & Progress Tracking Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5 bg-muted/30">
          <h2 className="font-display text-sm font-bold text-foreground">
            Planning Format &amp; Progress ({objectives.length})
          </h2>
          {canEdit && objectives.length > 0 && (
            <button
              type="button"
              disabled={saving}
              onClick={() => saveUpdate({ objectives }, "Milestone progress saved.")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              <IconSave size={12} />
              Save Progress
            </button>
          )}
        </div>

        {objectives.length === 0 ? (
          <div className="p-6 text-xs text-muted-foreground">
            This action plan was submitted via document upload attachment.
          </div>
        ) : (
          <>
          <div className="grid gap-3 border-b border-border bg-card px-5 py-4 sm:grid-cols-2">
            <div><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Objective 1</p><p className="mt-1 text-sm font-semibold text-foreground">{objectives[0]?.objectiveName || "—"}</p></div>
            <div><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Goal 1</p><p className="mt-1 text-sm font-semibold text-foreground">{objectives[0]?.goalName || "—"}</p></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/25 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-2.5">#</th>
                  <th className="px-4 py-2.5">Planned Activities</th>
                  <th className="px-3 py-2.5">Base line</th>
                  <th className="px-3 py-2.5">KPI</th>
                  <th className="px-3 py-2.5">Target</th>
                  <th className="px-4 py-2.5">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {objectives.map((obj, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-3 text-muted-foreground font-mono">{idx + 1}</td>
                    <td className="px-4 py-3 font-semibold text-foreground">{obj.activity}</td>
                    <td className="px-3 py-3 text-muted-foreground">{obj.baseline || "—"}</td>
                    <td className="px-3 py-3 text-muted-foreground">{obj.kpi || "—"}</td>
                    <td className="px-3 py-3 text-muted-foreground">{obj.target || obj.targetDate || "—"}</td>
                    <td className="px-4 py-3 min-w-[160px]">
                      {canEdit ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={5}
                            value={Number(obj.progress || 0)}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setObjectives((prev) =>
                                prev.map((r, i) =>
                                  i === idx
                                    ? {
                                        ...r,
                                        progress: val,
                                        status:
                                          val >= 100
                                            ? "completed"
                                            : val > 0
                                            ? "in_progress"
                                            : "not_started",
                                      }
                                    : r
                                )
                              );
                            }}
                            className="w-24 accent-accent"
                          />
                          <span className="font-mono font-bold tabular-nums w-9 text-right">
                            {obj.progress || 0}%
                          </span>
                        </div>
                      ) : (
                        <span className="font-mono font-bold">{obj.progress || 0}%</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {/* Direction & Admin Review Box */}
      {isPrivileged && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-3 shadow-xs">
          <h2 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
            <IconMessageSquare size={15} className="text-accent" />
            Direction &amp; Admin Review
          </h2>
          <textarea
            rows={3}
            placeholder="Record approval remarks, conditions, or revision guidance..."
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            className="w-full rounded-lg border border-border bg-card p-3 text-xs text-foreground"
          />
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                {
                  status: "approved" as ActionPlanStatus,
                  label: "Approve Action Plan",
                  cls: "bg-emerald-600 text-white hover:bg-emerald-700",
                },
                {
                  status: "revision_requested" as ActionPlanStatus,
                  label: "Request Revision",
                  cls: "border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20",
                },
                {
                  status: "completed" as ActionPlanStatus,
                  label: "Mark Completed",
                  cls: "bg-primary text-primary-foreground hover:opacity-90",
                },
              ] as const
            ).map((btn) => (
              <button
                key={btn.status}
                type="button"
                disabled={saving}
                onClick={() =>
                  saveUpdate(
                    { status: btn.status, review_notes: reviewNotes },
                    `Plan status updated to ${btn.status.replace("_", " ")}.`
                  )
                }
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer ${btn.cls}`}
              >
                <IconCheckCircle size={13} />
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

