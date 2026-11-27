"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconAlertCircle,
  IconArrowRight,
  IconBuilding,
  IconCalendar,
  IconCheckCircle,
  IconCheckSquare,
  IconClock,
  IconCompass,
  IconDownload,
  IconMessageSquare,
  IconMinus,
  IconPaperclip,
  IconPlus,
  IconSearch,
  IconSend,
  IconSparkles,
  IconUpload,
  IconX,
} from "./Icons";
import type {
  DataEntryMode,
  DirectionPoint,
  DirectivePriority,
  DirectiveRow,
  DirectiveStatus,
  FileAttachmentMeta,
} from "@/types/directive";
import type { AssignableUser } from "./TaskWorkspace";
import {
  Button,
  EmptyState,
  TablePagination,
} from "./ui";

const STATUS_BADGE: Record<DirectiveStatus, string> = {
  open: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25",
  in_progress:
    "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/25",
  awaiting_response:
    "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/25",
  completed:
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
  closed: "bg-muted text-muted-foreground border-border",
};

const STATUS_LABEL: Record<DirectiveStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  awaiting_response: "Awaiting Response",
  completed: "Completed",
  closed: "Closed",
};

const PRIORITY_BADGE: Record<DirectivePriority, string> = {
  urgent: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25",
  high: "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/25",
  medium: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25",
  low: "bg-muted text-muted-foreground border-border",
};

const DEPARTMENTS = [
  "All Departments",
  "Office of Direction & Board",
  "Executive Management",
  "Operations & Logistics",
  "Finance & Accounting",
  "Commercial & Sales",
  "Technology & Engineering",
  "Human Resources",
  "Legal & Governance",
  "Strategy & Business Dev",
];

function computeSlaLabel(slaDueAt: string | null, status: DirectiveStatus, nowMs: number) {
  if (!slaDueAt || status === "completed" || status === "closed") return null;
  const dueMs = new Date(slaDueAt).getTime();
  if (!Number.isFinite(dueMs)) return null;
  const diffMs = dueMs - nowMs;
  const absHours = Math.abs(diffMs) / (1000 * 60 * 60);
  const days = Math.floor(absHours / 24);
  const hours = Math.floor(absHours % 24);
  const span = days > 0 ? `${days}d ${hours}h` : `${Math.max(1, hours)}h`;

  if (diffMs < 0) {
    return { overdue: true, text: `SLA Overdue by ${span}` };
  }
  return { overdue: false, text: `SLA: ${span} left` };
}

interface InitialTaskDraft {
  id: number;
  title: string;
  assigned_to: string;
  due_date: string;
}

export function DirectivesWorkspace({
  initialDirectives,
  users,
  isPrivileged,
  defaultSlaDays,
  initialNowIso,
}: {
  initialDirectives: DirectiveRow[];
  users: AssignableUser[];
  isPrivileged: boolean;
  defaultSlaDays: number;
  initialNowIso: string;
}) {
  const router = useRouter();
  const [directives, setDirectives] = useState<DirectiveRow[]>(initialDirectives);
  const [statusFilter, setStatusFilter] = useState<"all" | DirectiveStatus>("all");
  const [search, setSearch] = useState("");
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // New Directive Modal state
  const [showModal, setShowModal] = useState(false);
  const [entryMode, setEntryMode] = useState<DataEntryMode>("form");
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("All Departments");
  const [priority, setPriority] = useState<DirectivePriority>("high");
  const [dueDate, setDueDate] = useState("");
  const [slaDays, setSlaDays] = useState(defaultSlaDays);
  const [directions, setDirections] = useState<DirectionPoint[]>([
    { text: "", owner: "", due_date: "" },
    { text: "", owner: "", due_date: "" },
    { text: "", owner: "", due_date: "" },
  ]);
  const [summary, setSummary] = useState("");
  const [summaryEngine, setSummaryEngine] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [attachments, setAttachments] = useState<FileAttachmentMeta[]>([]);
  const [uploading, setUploading] = useState(false);
  const [initialTasks, setInitialTasks] = useState<InitialTaskDraft[]>([]);
  const [saving, setSaving] = useState(false);

  const nowMs = useMemo(() => new Date(initialNowIso).getTime(), [initialNowIso]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return directives.filter((d) => {
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (!q) return true;
      return (
        d.title.toLowerCase().includes(q) ||
        d.reference_code.toLowerCase().includes(q) ||
        d.department.toLowerCase().includes(q) ||
        d.executive_summary.toLowerCase().includes(q)
      );
    });
  }, [directives, statusFilter, search]);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedDirectives = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const openCount = directives.filter(
    (d) => d.status === "open" || d.status === "in_progress"
  ).length;
  const awaitingCount = directives.filter((d) => d.status === "awaiting_response").length;
  const completedCount = directives.filter(
    (d) => d.status === "completed" || d.status === "closed"
  ).length;
  const slaBreachedCount = directives.filter((d) => {
    const s = computeSlaLabel(d.sla_due_at, d.status, nowMs);
    return s?.overdue;
  }).length;

  function resetModal() {
    setShowModal(false);
    setEntryMode("form");
    setTitle("");
    setDepartment("All Departments");
    setPriority("high");
    setDueDate("");
    setSlaDays(defaultSlaDays);
    setDirections([
      { text: "", owner: "", due_date: "" },
      { text: "", owner: "", due_date: "" },
      { text: "", owner: "", due_date: "" },
    ]);
    setSummary("");
    setSummaryEngine(null);
    setAttachments([]);
    setInitialTasks([]);
  }

  function updateDirection(index: number, field: keyof DirectionPoint, value: string) {
    setDirections((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  }

  function addDirectionRow() {
    if (directions.length >= 6) return;
    setDirections((prev) => [...prev, { text: "", owner: "", due_date: "" }]);
  }

  function removeDirectionRow(index: number) {
    if (directions.length <= 1) return;
    setDirections((prev) => prev.filter((_, idx) => idx !== index));
  }

  function addInitialTask() {
    setInitialTasks((prev) => [
      ...prev,
      {
        id: Date.now() + prev.length,
        title: "",
        assigned_to: users[0]?.id || "",
        due_date: dueDate,
      },
    ]);
  }

  async function handleAutoSummarize() {
    const filled = directions.filter((d) => d.text.trim().length > 0);
    if (filled.length === 0) {
      setBanner({ type: "err", text: "Enter 2–3 directions first to auto-summarize." });
      return;
    }
    setSummarizing(true);
    setBanner(null);
    try {
      const res = await fetch("/api/directives/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          department,
          priority,
          due_date: dueDate || null,
          directions: filled,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setBanner({ type: "err", text: data.error || "Could not generate summary." });
      } else {
        setSummary(data.summary);
        setSummaryEngine(data.engine);
      }
    } catch {
      setBanner({ type: "err", text: "Network error while summarizing directions." });
    } finally {
      setSummarizing(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
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
    } catch {
      setBanner({ type: "err", text: "Network error uploading file." });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleCreateDirective(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setBanner(null);
    try {
      const res = await fetch("/api/directives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          department,
          priority,
          entry_mode: entryMode,
          due_date: dueDate || null,
          sla_days: slaDays,
          directions: directions.filter((d) => d.text.trim().length > 0),
          executive_summary: summary,
          attachments,
          initial_tasks: initialTasks.filter((t) => t.title.trim() && t.assigned_to),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setBanner({ type: "err", text: data.error || "Failed to issue directive." });
      } else {
        setDirectives((prev) => [data.directive, ...prev]);
        resetModal();
        setBanner({
          type: "ok",
          text: `Directive ${data.directive.reference_code} issued${
            data.tasksCreated > 0
              ? ` with ${data.tasksCreated} concurrent task${data.tasksCreated === 1 ? "" : "s"}`
              : ""
          }.`,
        });
        router.refresh();
      }
    } catch {
      setBanner({ type: "err", text: "Network error issuing directive." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {banner && (
        <div
          className={`rounded-xl border p-4 text-xs font-medium flex items-center justify-between gap-3 ${
            banner.type === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-brand"
              : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
          }`}
        >
          <span>{banner.text}</span>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="opacity-70 hover:opacity-100 cursor-pointer"
          >
            <IconX size={14} />
          </button>
        </div>
      )}

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Active Directives
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <IconCompass size={16} />
            </div>
          </div>
          <p className="font-display text-2xl sm:text-3xl font-bold text-foreground mt-2 tabular-nums">
            {openCount}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {directives.length} total recorded
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Awaiting Reply
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300">
              <IconClock size={16} />
            </div>
          </div>
          <p className="font-display text-2xl sm:text-3xl font-bold text-amber-700 dark:text-amber-300 mt-2 tabular-nums">
            {awaitingCount}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Default SLA: {defaultSlaDays} day{defaultSlaDays === 1 ? "" : "s"}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              SLA Overdue
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <IconAlertCircle size={16} />
            </div>
          </div>
          <p className="font-display text-2xl sm:text-3xl font-bold text-rose-700 dark:text-rose-300 mt-2 tabular-nums">
            {slaBreachedCount}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Requires immediate response
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Completed
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <IconCheckCircle size={16} />
            </div>
          </div>
          <p className="font-display text-2xl sm:text-3xl font-bold text-emerald-700 dark:text-emerald-300 mt-2 tabular-nums">
            {completedCount}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Closed &amp; verified mandates
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
              placeholder="Search directive, reference, department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>

          <div className="inline-flex h-9 items-center rounded-lg bg-muted p-1 text-xs border border-border/60">
            {(
              ["all", "open", "awaiting_response", "in_progress", "completed"] as const
            ).map((s) => (
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
                {s === "all" ? "All" : STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>

        {isPrivileged && (
          <Button
            variant="brand"
            size="sm"
            leftIcon={<IconPlus size={14} />}
            onClick={() => setShowModal(true)}
          >
            Issue New Directive
          </Button>
        )}
      </div>

      {/* Directives List */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No directives found"
          description={
            isPrivileged
              ? "Issue a new directive with 2–3 direction points, auto-summarize it, assign concurrent follow-up tasks, and collaborate in real time."
              : "No active directives are currently assigned to your division."
          }
          actionLabel={isPrivileged ? "Issue New Directive" : undefined}
          onAction={isPrivileged ? () => setShowModal(true) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {paginatedDirectives.map((d) => {
            const sla = computeSlaLabel(d.sla_due_at, d.status, nowMs);
            const totalTasks = Number(d.total_tasks || 0);
            const doneTasks = Number(d.completed_tasks || 0);
            const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

            return (
              <div
                key={d.id}
                className={`rounded-xl border bg-card p-5 shadow-xs transition-all hover:shadow-sm ${
                  sla?.overdue ? "border-rose-500/40" : "border-border"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="space-y-2.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-accent bg-accent/10 border border-accent/25 px-2 py-0.5 rounded-md">
                        {d.reference_code}
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${STATUS_BADGE[d.status]}`}
                      >
                        {STATUS_LABEL[d.status]}
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${PRIORITY_BADGE[d.priority]}`}
                      >
                        {d.priority}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {d.entry_mode === "upload" ? "Document Upload" : "ERP Form"}
                      </span>
                      {sla && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                            sla.overdue
                              ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30"
                              : "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/25"
                          }`}
                        >
                          <IconClock size={10} />
                          {sla.text}
                        </span>
                      )}
                    </div>

                    <div>
                      <Link
                        href={`/directives/${d.id}`}
                        className="text-base font-bold text-foreground hover:text-accent transition-colors"
                      >
                        {d.title}
                      </Link>
                      {d.executive_summary && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {d.executive_summary}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground tabular-nums">
                      <span className="inline-flex items-center gap-1 font-medium text-foreground">
                        <IconBuilding size={12} className="text-muted-foreground" />
                        {d.department}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <IconSparkles size={12} className="text-accent" />
                        {Array.isArray(d.directions) ? d.directions.length : 0} direction
                        {(Array.isArray(d.directions) ? d.directions.length : 0) === 1 ? "" : "s"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <IconCheckSquare size={12} />
                        {doneTasks}/{totalTasks} tasks ({pct}%)
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <IconMessageSquare size={12} />
                        {Number(d.comment_count || 0)} comments
                      </span>
                      {d.due_date && (
                        <span className="inline-flex items-center gap-1">
                          <IconCalendar size={12} />
                          Due {d.due_date}
                        </span>
                      )}
                    </div>

                    {totalTasks > 0 && (
                      <div className="max-w-xs pt-1">
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <a
                      href={`/api/directives/${d.id}/export?format=docx`}
                      download
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                    >
                      <IconDownload size={12} />
                      Letterhead
                    </a>
                    <Link
                      href={`/directives/${d.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
                    >
                      Open Follow-up
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

      {/* Issue New Directive Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-3 sm:p-5 backdrop-blur-xs animate-in fade-in-50">
          <div className="w-full max-w-3xl max-h-[92vh] rounded-xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/30 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <IconCompass size={18} />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-foreground">
                    Issue New Directive
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Enter 2–3 directions, auto-summarize, attach files, and spawn concurrent tasks.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={resetModal}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              >
                <IconX size={16} />
              </button>
            </div>

            <form
              onSubmit={handleCreateDirective}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                {/* Dual Data Entry Switcher */}
                <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-2.5">
                  <span className="text-xs font-semibold text-foreground pl-1">
                    Data Entry Mode (ERP-Ready)
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
                      Structured Form
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
                      Document Upload
                    </button>
                  </div>
                </div>

                {/* Title & Meta */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Directive Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Q4 Fleet Maintenance & Procurement Follow-up"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Target Division / Department
                    </label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none"
                    >
                      {DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        Priority
                      </label>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as DirectivePriority)}
                        className="w-full rounded-lg border border-border bg-card px-2 py-2 text-xs text-foreground focus:border-accent focus:outline-none"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        Due Date
                      </label>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full rounded-lg border border-border bg-card px-2 py-2 text-xs text-foreground focus:border-accent focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        SLA (Days)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={slaDays}
                        onChange={(e) => setSlaDays(Number(e.target.value) || 3)}
                        className="w-full rounded-lg border border-border bg-card px-2 py-2 text-xs text-foreground focus:border-accent focus:outline-none tabular-nums"
                      />
                    </div>
                  </div>
                </div>

                {/* 2–3 Directions Builder */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground">
                      Directions Given (2–3 Recommended) {entryMode === "form" ? "*" : "(Optional)"}
                    </label>
                    <button
                      type="button"
                      onClick={addDirectionRow}
                      disabled={directions.length >= 6}
                      className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-muted/80 disabled:opacity-40 cursor-pointer"
                    >
                      <IconPlus size={11} />
                      Add Direction
                    </button>
                  </div>

                  {directions.map((dir, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-border bg-muted/20 p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Direction #{idx + 1}
                        </span>
                        {directions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeDirectionRow(idx)}
                            className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                          >
                            <IconMinus size={10} />
                            Remove
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder={`Enter direction #${idx + 1} mandate...`}
                        value={dir.text}
                        onChange={(e) => updateDirection(idx, "text", e.target.value)}
                        className="w-full rounded-md border border-border bg-card px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Accountable owner / unit (optional)"
                          value={dir.owner || ""}
                          onChange={(e) => updateDirection(idx, "owner", e.target.value)}
                          className="rounded-md border border-border bg-card px-2.5 py-1.5 text-[11px] text-foreground focus:border-accent focus:outline-none"
                        />
                        <input
                          type="date"
                          value={dir.due_date || ""}
                          onChange={(e) => updateDirection(idx, "due_date", e.target.value)}
                          className="rounded-md border border-border bg-card px-2.5 py-1.5 text-[11px] text-foreground focus:border-accent focus:outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* AI Auto-Summarization Box */}
                <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <IconSparkles size={15} className="text-accent" />
                      <span className="text-xs font-bold text-foreground">
                        AI Executive Summary
                      </span>
                      {summaryEngine && (
                        <span className="rounded-full bg-card border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          {summaryEngine === "gemini" ? "Gemini AI" : "Smart Synthesis"}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleAutoSummarize}
                      disabled={summarizing}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[11px] font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-50 cursor-pointer"
                    >
                      <IconSparkles size={12} />
                      {summarizing ? "Synthesizing..." : "Auto-Summarize Directions"}
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    placeholder="Click 'Auto-Summarize Directions' to synthesize your 2–3 directions into a concise executive brief, or type directly..."
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    className="w-full rounded-lg border border-border bg-card p-3 text-xs text-foreground leading-relaxed focus:border-accent focus:outline-none"
                  />
                </div>

                {/* File Upload (Dual Mode / Supporting Docs) */}
                <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <IconUpload size={14} className="text-muted-foreground" />
                      Attach Official Memo / Supporting Document
                    </span>
                    <label className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-[11px] font-semibold text-foreground hover:bg-muted cursor-pointer">
                      <IconPaperclip size={12} />
                      {uploading ? "Uploading..." : "Upload File"}
                      <input
                        type="file"
                        className="hidden"
                        disabled={uploading}
                        onChange={handleFileUpload}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg"
                      />
                    </label>
                  </div>
                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {attachments.map((att) => (
                        <span
                          key={att.id}
                          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-foreground"
                        >
                          <IconPaperclip size={11} className="text-accent" />
                          {att.file_name}
                          <button
                            type="button"
                            onClick={() =>
                              setAttachments((prev) => prev.filter((f) => f.id !== att.id))
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

                {/* Inline Multi-Tasking Builder */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <IconCheckSquare size={14} className="text-accent" />
                      Concurrent Follow-up Tasks ({initialTasks.length})
                    </label>
                    <button
                      type="button"
                      onClick={addInitialTask}
                      className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-muted/80 cursor-pointer"
                    >
                      <IconPlus size={11} />
                      Add Concurrent Task
                    </button>
                  </div>
                  {initialTasks.map((t, idx) => (
                    <div
                      key={t.id}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2 rounded-lg border border-border bg-muted/20 p-2.5 items-center"
                    >
                      <input
                        type="text"
                        placeholder={`Task #${idx + 1} title`}
                        value={t.title}
                        onChange={(e) =>
                          setInitialTasks((prev) =>
                            prev.map((row) =>
                              row.id === t.id ? { ...row, title: e.target.value } : row
                            )
                          )
                        }
                        className="sm:col-span-5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-foreground"
                      />
                      <select
                        value={t.assigned_to}
                        onChange={(e) =>
                          setInitialTasks((prev) =>
                            prev.map((row) =>
                              row.id === t.id ? { ...row, assigned_to: e.target.value } : row
                            )
                          )
                        }
                        className="sm:col-span-4 rounded-md border border-border bg-card px-2 py-1.5 text-xs text-foreground"
                      >
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.full_name} ({u.department})
                          </option>
                        ))}
                      </select>
                      <input
                        type="date"
                        value={t.due_date}
                        onChange={(e) =>
                          setInitialTasks((prev) =>
                            prev.map((row) =>
                              row.id === t.id ? { ...row, due_date: e.target.value } : row
                            )
                          )
                        }
                        className="sm:col-span-2 rounded-md border border-border bg-card px-2 py-1.5 text-[11px] text-foreground"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setInitialTasks((prev) => prev.filter((row) => row.id !== t.id))
                        }
                        className="sm:col-span-1 flex justify-center text-rose-600 hover:text-rose-700 cursor-pointer"
                      >
                        <IconX size={14} />
                      </button>
                    </div>
                  ))}
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
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  <IconSend size={13} />
                  {saving ? "Issuing Directive..." : "Issue Directive"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

