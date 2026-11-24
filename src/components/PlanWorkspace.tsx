"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconArrowRight,
  IconBuilding,
  IconCalendar,
  IconCheckCircle,
  IconClock,
  IconCompass,
  IconDownload,
  IconFileText,
  IconPaperclip,
  IconPlus,
  IconSearch,
  IconSend,
  IconTarget,
  IconUpload,
  IconX,
} from "./Icons";
import {
  emptyActionPlanObjective,
  type ActionPlanObjective,
  type ActionPlanRow,
  type ActionPlanStatus,
} from "@/types/plan";
import type { DataEntryMode, FileAttachmentMeta } from "@/types/directive";
import {
  Button,
  EmptyState,
  TablePagination,
} from "./ui";

const PLAN_STATUS_STYLE: Record<ActionPlanStatus, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  submitted: "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/25",
  approved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
  revision_requested: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25",
  completed: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25",
};

const PLAN_STATUS_LABEL: Record<ActionPlanStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  approved: "Approved",
  revision_requested: "Revision Requested",
  completed: "Completed",
};

export interface DirectiveOption {
  id: string;
  reference_code: string;
  title: string;
}

export function PlanWorkspace({
  initialPlans,
  directives,
  defaultDepartment,
  todayYmd,
  preselectedDirectiveId,
}: {
  initialPlans: ActionPlanRow[];
  directives: DirectiveOption[];
  defaultDepartment: string;
  todayYmd: string;
  preselectedDirectiveId?: string;
}) {
  const router = useRouter();
  const [plans, setPlans] = useState<ActionPlanRow[]>(initialPlans);
  const [statusFilter, setStatusFilter] = useState<"all" | ActionPlanStatus>("all");
  const [search, setSearch] = useState("");
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(Boolean(preselectedDirectiveId));
  const [entryMode, setEntryMode] = useState<DataEntryMode>("form");
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState(defaultDepartment || "Operations & Logistics");
  const [directiveId, setDirectiveId] = useState(preselectedDirectiveId || "");
  const [periodStart, setPeriodStart] = useState(todayYmd);
  const [periodEnd, setPeriodEnd] = useState(todayYmd);
  const [summary, setSummary] = useState("");
  const [planningObjective, setPlanningObjective] = useState("");
  const [planningGoal, setPlanningGoal] = useState("");
  const [objectives, setObjectives] = useState<ActionPlanObjective[]>(
    Array.from({ length: 7 }, () => emptyActionPlanObjective())
  );
  const [attachments, setAttachments] = useState<FileAttachmentMeta[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return plans.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.reference_code.toLowerCase().includes(q) ||
        p.department.toLowerCase().includes(q) ||
        (p.author_name || "").toLowerCase().includes(q)
      );
    });
  }, [plans, statusFilter, search]);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedPlans = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  function resetModal() {
    setShowModal(false);
    setEntryMode("form");
    setTitle("");
    setDirectiveId("");
    setPeriodStart(todayYmd);
    setPeriodEnd(todayYmd);
    setSummary("");
    setPlanningObjective("");
    setPlanningGoal("");
    setObjectives(Array.from({ length: 7 }, () => emptyActionPlanObjective()));
    setAttachments([]);
  }

  function loadDemoPlan() {
    setEntryMode("form");
    setTitle("Quarterly Service Reliability Improvement Plan");
    setDepartment(defaultDepartment || "Operations & Logistics");
    setPeriodStart(todayYmd);
    setPeriodEnd(todayYmd);
    setSummary("Improve service reliability through preventive maintenance, faster incident response, and weekly performance reviews.");
    setPlanningObjective("Improve operational service reliability and fleet availability.");
    setPlanningGoal("Achieve at least 95% on-schedule maintenance and resolve 90% of service incidents within SLA.");
    setObjectives([
      { ...emptyActionPlanObjective(), activity: "Complete preventive maintenance checks", kpi: "Vehicles maintained on schedule", target: "95%", owner: "Operations team", targetDate: todayYmd, progress: 35, status: "in_progress" },
      { ...emptyActionPlanObjective(), activity: "Reduce unresolved service incidents", kpi: "Incidents resolved within SLA", target: "90%", owner: "Service desk", targetDate: todayYmd, progress: 0, status: "not_started" },
    ]);
    setAttachments([]);
  }

  function updateObjective(
    index: number,
    field: keyof ActionPlanObjective,
    value: string | number
  ) {
    setObjectives((prev) =>
      prev.map((row, idx) => (idx === index ? { ...row, [field]: value } : row))
    );
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setBanner(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setBanner({ type: "err", text: data.error || "File upload failed." });
      } else {
        setAttachments((prev) => [...prev, data.file]);
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleSubmitPlan(status: "draft" | "submitted") {
    if (!title.trim()) {
      setBanner({ type: "err", text: "Action plan title is required." });
      return;
    }
    if (entryMode === "form" && (!planningObjective.trim() || !planningGoal.trim())) {
      setBanner({ type: "err", text: "Complete Objective 1 and Goal 1 in the planning format." });
      return;
    }
    if (entryMode === "form" && !objectives.some((row) => row.activity.trim())) {
      setBanner({ type: "err", text: "Enter at least one planned activity." });
      return;
    }
    setSaving(true);
    setBanner(null);
    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          department,
          directive_id: directiveId || null,
          period_start: periodStart,
          period_end: periodEnd,
          entry_mode: entryMode,
          summary,
          objectives: objectives
            .filter((o) => o.activity.trim())
            .map((o) => ({ ...o, objectiveName: planningObjective.trim(), goalName: planningGoal.trim() })),
          attachments,
          status,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setBanner({ type: "err", text: data.error || "Could not submit action plan." });
      } else {
        setPlans((prev) => [data.plan, ...prev]);
        resetModal();
        setBanner({
          type: "ok",
          text:
            status === "draft"
              ? `Saved draft action plan ${data.plan.reference_code}.`
              : `Submitted action plan ${data.plan.reference_code} for Direction review!`,
        });
        router.refresh();
      }
    } catch (error) {
      setBanner({
        type: "err",
        text: error instanceof Error ? error.message : "Could not submit action plan. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  const submittedCount = plans.filter((p) => p.status === "submitted").length;
  const approvedCount = plans.filter(
    (p) => p.status === "approved" || p.status === "completed"
  ).length;
  const revisionCount = plans.filter((p) => p.status === "revision_requested").length;

  return (
    <div className="space-y-6">
      {banner && (
        <div
          className={`rounded-xl border p-4 text-xs font-medium flex items-center justify-between gap-2 ${
            banner.type === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
              : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
          }`}
        >
          <span>{banner.text}</span>
          <button type="button" onClick={() => setBanner(null)} className="cursor-pointer">
            <IconX size={14} />
          </button>
        </div>
      )}

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Total Plans
          </span>
          <p className="font-display text-2xl sm:text-3xl font-bold text-foreground mt-2 tabular-nums">
            {plans.length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Awaiting Review
          </span>
          <p className="font-display text-2xl sm:text-3xl font-bold text-amber-700 dark:text-amber-300 mt-2 tabular-nums">
            {submittedCount}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Approved / Done
          </span>
          <p className="font-display text-2xl sm:text-3xl font-bold text-emerald-700 dark:text-emerald-300 mt-2 tabular-nums">
            {approvedCount}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Revision Needed
          </span>
          <p className="font-display text-2xl sm:text-3xl font-bold text-rose-700 dark:text-rose-300 mt-2 tabular-nums">
            {revisionCount}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <IconSearch
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="Search plans, reference code, department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-xs text-foreground focus:border-accent focus:outline-none"
            />
          </div>

          <div className="inline-flex h-9 items-center rounded-lg bg-muted p-1 text-xs border border-border/60">
            {(["all", "submitted", "approved", "revision_requested", "draft"] as const).map(
              (s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-md px-2.5 py-1 font-semibold transition-all cursor-pointer ${
                    statusFilter === s
                      ? "bg-card text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s === "all" ? "All" : PLAN_STATUS_LABEL[s]}
                </button>
              )
            )}
          </div>
        </div>

        <Button
          variant="brand"
          size="sm"
          leftIcon={<IconPlus size={14} />}
          onClick={() => setShowModal(true)}
        >
          Submit Action Plan
        </Button>
      </div>

      {/* Plan Cards */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No action plans submitted yet"
          description="Submit structured ERP-style action plans with milestones and KPIs or upload an official plan document directly."
          actionLabel="Submit Action Plan"
          onAction={() => setShowModal(true)}
        />
      ) : (
        <div className="space-y-3">
          {paginatedPlans.map((plan) => {
            const objs = Array.isArray(plan.objectives) ? plan.objectives : [];
            const avgProgress =
              objs.length > 0
                ? Math.round(
                    objs.reduce((sum, o) => sum + Number(o.progress || 0), 0) / objs.length
                  )
                : 0;

            return (
              <div
                key={plan.id}
                className="rounded-xl border border-border bg-card p-5 shadow-xs hover:shadow-sm transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-accent bg-accent/10 border border-accent/25 px-2 py-0.5 rounded-md">
                        {plan.reference_code}
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${PLAN_STATUS_STYLE[plan.status]}`}
                      >
                        {PLAN_STATUS_LABEL[plan.status]}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {plan.entry_mode === "upload" ? "Document Upload" : "ERP Form"}
                      </span>
                      {plan.directive_ref && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-300">
                          <IconCompass size={10} />
                          Linked: {plan.directive_ref}
                        </span>
                      )}
                    </div>

                    <Link
                      href={`/plans/${plan.id}`}
                      className="block text-base font-bold text-foreground hover:text-accent transition-colors"
                    >
                      {plan.title}
                    </Link>

                    {plan.summary && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {plan.summary}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground tabular-nums">
                      <span className="inline-flex items-center gap-1 font-medium text-foreground">
                        <IconBuilding size={12} />
                        {plan.department}
                      </span>
                      <span>By {plan.author_name || "Staff"}</span>
                      <span className="inline-flex items-center gap-1">
                        <IconCalendar size={12} />
                        {plan.period_start} → {plan.period_end}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <IconCheckCircle size={12} />
                        {objs.length} milestone{objs.length === 1 ? "" : "s"} ({avgProgress}% avg)
                      </span>
                      {plan.attachments.length > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <IconFileText size={12} />
                          {plan.attachments.length} file{plan.attachments.length === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={`/api/plans/${plan.id}/export?format=docx`}
                      download
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                    >
                      <IconDownload size={12} />
                      Letterhead
                    </a>
                    <Link
                      href={`/plans/${plan.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                    >
                      Inspect Plan
                      <IconArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}

          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filtered.length}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>
      )}

      {/* Submit Action Plan Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-3 sm:p-5 backdrop-blur-xs">
          <div className="w-full max-w-3xl max-h-[92vh] rounded-xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/30 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <IconTarget size={18} />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-foreground">
                    Add Plan · Planning Format
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Complete the planning sheet fields below. Your plan is saved in the same structure as the approved format.
                  </p>
                </div>
              </div>
                <button type="button" onClick={loadDemoPlan} className="mr-auto inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"><IconFileText size={14} />Load demo</button>
                <button
                type="button"
                onClick={resetModal}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted cursor-pointer"
              >
                <IconX size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Dual Mode Toggle */}
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-2.5">
                <span className="text-xs font-semibold text-foreground pl-1">
                  Data Entry Mode
                </span>
                <div className="inline-flex rounded-md bg-muted p-0.5 text-xs border border-border/60">
                  <button
                    type="button"
                    onClick={() => setEntryMode("form")}
                    className={`rounded px-3 py-1 text-[11px] font-semibold cursor-pointer ${
                      entryMode === "form"
                        ? "bg-card text-foreground shadow-2xs"
                        : "text-muted-foreground"
                    }`}
                  >
                    ERP Structured Form
                  </button>
                  <button
                    type="button"
                    onClick={() => setEntryMode("upload")}
                    className={`rounded px-3 py-1 text-[11px] font-semibold cursor-pointer ${
                      entryMode === "upload"
                        ? "bg-card text-foreground shadow-2xs"
                        : "text-muted-foreground"
                    }`}
                  >
                    File Upload
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Action Plan Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Q4 Fleet Maintenance & Fuel Cost Reduction Plan"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Department / Business Unit
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Linked Directive (Optional)
                  </label>
                  <select
                    value={directiveId}
                    onChange={(e) => setDirectiveId(e.target.value)}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground"
                  >
                    <option value="">Standalone Plan (No Directive Link)</option>
                    {directives.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.reference_code} — {d.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Target Completion Date
                  </label>
                  <input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Executive Overview / Objectives Summary
                </label>
                <textarea
                  rows={2}
                  placeholder="Briefly describe the expected operational impact and scope of this plan..."
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card p-3 text-xs text-foreground"
                />
              </div>

              {/* Planning Format 2 worksheet */}
              <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm" aria-labelledby="planning-format-title">
                <div className="flex flex-col gap-1 border-b border-border bg-gradient-to-r from-muted/70 to-card px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 id="planning-format-title" className="font-display text-base font-bold tracking-tight text-foreground">Planning Format</h4>
                    <span className="rounded-full border border-border bg-card px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">7 activity rows</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Set one objective and goal, then describe planned activities, their baseline, KPI, and target.</p>
                </div>

                <div className="grid gap-3 border-b border-border p-4 sm:grid-cols-2 sm:p-5">
                  <label className="block space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Objective 1</span>
                    <input type="text" value={planningObjective} onChange={(e) => setPlanningObjective(e.target.value)} placeholder="Enter the objective" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15" />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Goal 1</span>
                    <input type="text" value={planningGoal} onChange={(e) => setPlanningGoal(e.target.value)} placeholder="Enter the goal" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15" />
                  </label>
                </div>

                <div className="hidden gap-3 bg-muted/40 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground md:grid md:grid-cols-[3rem_minmax(0,2fr)_minmax(8rem,1fr)_minmax(8rem,1fr)_minmax(7rem,0.8fr)] md:px-5">
                  <span>S.No.</span><span>Objectives / Goals / Planned Activities</span><span>Base line</span><span>Key performance indicators (KPI)</span><span>Target</span>
                </div>
                <div className="space-y-3 p-3 sm:p-4 md:space-y-0 md:p-0">
                  {objectives.map((obj, idx) => (
                    <div key={idx} className="grid gap-3 rounded-xl border border-border/80 bg-background p-3 md:rounded-none md:border-0 md:border-t md:border-border md:px-5 md:py-3 md:grid-cols-[3rem_minmax(0,2fr)_minmax(8rem,1fr)_minmax(8rem,1fr)_minmax(7rem,0.8fr)] md:items-center">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted font-mono text-xs font-bold text-muted-foreground md:h-auto md:w-auto md:justify-start md:bg-transparent">{idx + 1}</span>
                      <label className="space-y-1 md:space-y-0"><span className="text-[10px] font-semibold text-muted-foreground md:sr-only">Planned Activities</span><input aria-label={`Planned activity ${idx + 1}`} type="text" placeholder="Planned activity" value={obj.activity} onChange={(e) => updateObjective(idx, "activity", e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15" /></label>
                      <label className="space-y-1 md:space-y-0"><span className="text-[10px] font-semibold text-muted-foreground md:sr-only">Base line</span><input aria-label={`Baseline ${idx + 1}`} type="text" placeholder="Base line" value={obj.baseline || ""} onChange={(e) => updateObjective(idx, "baseline", e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15" /></label>
                      <label className="space-y-1 md:space-y-0"><span className="text-[10px] font-semibold text-muted-foreground md:sr-only">Key performance indicator</span><input aria-label={`KPI ${idx + 1}`} type="text" placeholder="KPI" value={obj.kpi} onChange={(e) => updateObjective(idx, "kpi", e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15" /></label>
                      <label className="space-y-1 md:space-y-0"><span className="text-[10px] font-semibold text-muted-foreground md:sr-only">Target</span><input aria-label={`Target ${idx + 1}`} type="text" placeholder="Target" value={obj.target || ""} onChange={(e) => updateObjective(idx, "target", e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15" /></label>
                    </div>
                  ))}
                </div>
              </section>

              {/* File Upload Area */}
              <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <IconUpload size={14} className="text-muted-foreground" />
                    Upload Action Plan File (PDF, DOCX, XLSX)
                  </span>
                  <label className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-[11px] font-semibold text-foreground hover:bg-muted cursor-pointer">
                    <IconPaperclip size={12} />
                    {uploading ? "Uploading..." : "Choose File"}
                    <input
                      type="file"
                      className="hidden"
                      disabled={uploading}
                      onChange={handleUpload}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg"
                    />
                  </label>
                </div>
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((f) => (
                      <span
                        key={f.id}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px]"
                      >
                        <IconPaperclip size={11} className="text-accent" />
                        {f.file_name}
                        <button
                          type="button"
                          onClick={() =>
                            setAttachments((prev) => prev.filter((x) => x.id !== f.id))
                          }
                          className="text-muted-foreground hover:text-rose-500 cursor-pointer"
                        >
                          <IconX size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4 bg-card shrink-0">
              <button
                type="button"
                onClick={resetModal}
                className="rounded-lg border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSubmitPlan("draft")}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted px-3.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/80 disabled:opacity-50 cursor-pointer"
              >
                <IconClock size={12} />
                Save Draft
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSubmitPlan("submitted")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                <IconSend size={13} />
                {saving ? "Submitting..." : "Submit Action Plan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

