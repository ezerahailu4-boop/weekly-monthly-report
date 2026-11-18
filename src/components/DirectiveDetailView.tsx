"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconAlertCircle,
  IconArrowLeft,
  IconBuilding,
  IconCalendar,
  IconCheck,
  IconCheckCircle,
  IconCheckSquare,
  IconClock,
  IconDownload,
  IconFileText,
  IconMessageSquare,
  IconPaperclip,
  IconPlus,
  IconPrinter,
  IconSend,
  IconSparkles,
  IconTarget,
  IconTrash,
  IconX,
} from "./Icons";
import { formatDate } from "@/lib/dateUtils";
import type {
  DirectiveCommentRow,
  DirectiveRow,
  DirectiveStatus,
  FileAttachmentMeta,
} from "@/types/directive";
import type { TaskPriority, TaskRow, TaskStatus } from "@/types/task";
import type { AssignableUser } from "./TaskWorkspace";

interface LinkedPlanSummary {
  id: string;
  reference_code: string;
  title: string;
  department: string;
  status: string;
  period_start: string;
  period_end: string;
  author_name: string;
}

function formatCountdown(deadlineIso: string | null, nowMs: number) {
  if (!deadlineIso) return null;
  const dueMs = new Date(deadlineIso).getTime();
  if (!Number.isFinite(dueMs)) return null;
  const diff = dueMs - nowMs;
  const absSec = Math.floor(Math.abs(diff) / 1000);
  const days = Math.floor(absSec / 86400);
  const hours = Math.floor((absSec % 86400) / 3600);
  const mins = Math.floor((absSec % 3600) / 60);
  const formatted =
    days > 0 ? `${days}d ${hours}h ${mins}m` : `${hours}h ${mins}m`;
  return {
    overdue: diff < 0,
    label: diff < 0 ? `SLA Breached (${formatted} ago)` : `${formatted} remaining`,
  };
}

export function DirectiveDetailView({
  initialDirective,
  initialTasks,
  initialComments,
  linkedPlans,
  users,
  currentUserId,
  isPrivileged,
  initialNowIso,
}: {
  initialDirective: DirectiveRow;
  initialTasks: TaskRow[];
  initialComments: DirectiveCommentRow[];
  linkedPlans: LinkedPlanSummary[];
  users: AssignableUser[];
  currentUserId: string;
  isPrivileged: boolean;
  initialNowIso: string;
}) {
  const router = useRouter();
  const [directive, setDirective] = useState<DirectiveRow>(initialDirective);
  const [tasks, setTasks] = useState<TaskRow[]>(initialTasks);
  const [comments, setComments] = useState<DirectiveCommentRow[]>(initialComments);
  const [nowMs, setNowMs] = useState<number>(() => new Date(initialNowIso).getTime());
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Add Concurrent Multi-Task inline state
  const [showAddTask, setShowAddTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskAssigneeIds, setTaskAssigneeIds] = useState<string[]>(
    users[0]?.id ? [users[0].id] : []
  );
  const [taskPriority, setTaskPriority] = useState<TaskPriority>(directive.priority);
  const [taskDue, setTaskDue] = useState(directive.due_date || "");
  const [addingTask, setAddingTask] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);

  // Re-summarize state
  const [resummarizing, setResummarizing] = useState(false);

  // Contextual Chat composer state
  const [chatText, setChatText] = useState("");
  const [chatAttachment, setChatAttachment] = useState<FileAttachmentMeta | null>(null);
  const [uploadingChatFile, setUploadingChatFile] = useState(false);
  const [requiresResponse, setRequiresResponse] = useState(true);
  const [sendingChat, setSendingChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Live SLA clock tick (every 30s) & live comment polling (every 8s)
  useEffect(() => {
    const clockTimer = setInterval(() => {
      setNowMs(Date.now());
    }, 30000);

    const pollTimer = setInterval(async () => {
      try {
        const res = await fetch(`/api/directives/${directive.id}/comments`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && Array.isArray(data.comments)) {
          setComments(data.comments);
          if (data.sla) {
            setDirective((prev) => ({
              ...prev,
              status: data.sla.status || prev.status,
              sla_due_at: data.sla.sla_due_at ?? prev.sla_due_at,
              last_comment_at: data.sla.last_comment_at ?? prev.last_comment_at,
            }));
          }
        }
      } catch {
        // Silent background poll
      }
    }, 8000);

    return () => {
      clearInterval(clockTimer);
      clearInterval(pollTimer);
    };
  }, [directive.id]);

  const completedTasksCount = tasks.filter((t) => t.status === "completed").length;
  const taskPct =
    tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : 0;

  const isClosed = directive.status === "completed" || directive.status === "closed";
  const slaState = isClosed ? null : formatCountdown(directive.sla_due_at, nowMs);

  async function handleStatusUpdate(nextStatus: DirectiveStatus) {
    setBanner(null);
    const res = await fetch(`/api/directives/${directive.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      setBanner({ type: "err", text: data.error || "Could not update status." });
    } else {
      setDirective((prev) => ({ ...prev, status: data.directive.status }));
      router.refresh();
    }
  }

  async function handleRegenerateSummary() {
    if (!directive.directions || directive.directions.length === 0) return;
    setResummarizing(true);
    setBanner(null);
    try {
      const res = await fetch("/api/directives/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: directive.title,
          department: directive.department,
          priority: directive.priority,
          due_date: directive.due_date,
          directions: directive.directions,
        }),
      });
      const data = await res.json();
      if (res.ok && data.summary) {
        const patchRes = await fetch(`/api/directives/${directive.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ executive_summary: data.summary }),
        });
        const patchData = await patchRes.json();
        if (patchRes.ok && patchData.success) {
          setDirective((prev) => ({
            ...prev,
            executive_summary: patchData.directive.executive_summary,
          }));
          setBanner({ type: "ok", text: "Executive summary refreshed." });
        }
      }
    } finally {
      setResummarizing(false);
    }
  }

  function toggleTaskAssignee(uid: string) {
    setTaskAssigneeIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  }

  async function handleAddConcurrentTasks(e: React.FormEvent) {
    e.preventDefault();
    if (!taskTitle.trim() || taskAssigneeIds.length === 0) return;
    setAddingTask(true);
    setBanner(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks: [
            {
              title: taskTitle.trim(),
              description: taskDesc.trim(),
              priority: taskPriority,
              due_date: taskDue || null,
            },
          ],
          assigned_to: taskAssigneeIds,
          directive_id: directive.id,
          notify_telegram: true,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setBanner({ type: "err", text: data.error || "Failed to add task." });
      } else {
        setTasks((prev) => [...(data.tasks || []), ...prev]);
        setTaskTitle("");
        setTaskDesc("");
        setShowAddTask(false);
        setBanner({
          type: "ok",
          text: `Assigned ${data.created || 1} concurrent task${(data.created || 1) === 1 ? "" : "s"} under this directive.`,
        });
        router.refresh();
      }
    } finally {
      setAddingTask(false);
    }
  }

  async function handleTaskStatus(task: TaskRow, nextStatus: TaskStatus) {
    setBusyTaskId(task.id);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (res.ok && data.task) {
        setTasks((prev) => prev.map((t) => (t.id === task.id ? data.task : t)));
      }
    } finally {
      setBusyTaskId(null);
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (!confirm("Delete this linked task?")) return;
    setBusyTaskId(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      }
    } finally {
      setBusyTaskId(null);
    }
  }

  async function handleChatUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingChatFile(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok && data.file) {
        setChatAttachment(data.file);
      } else {
        setBanner({ type: "err", text: data.error || "File upload failed." });
      }
    } finally {
      setUploadingChatFile(false);
      e.target.value = "";
    }
  }

  async function handleSendComment(e: React.FormEvent) {
    e.preventDefault();
    if (!chatText.trim() && !chatAttachment) return;
    setSendingChat(true);
    setBanner(null);
    try {
      const res = await fetch(`/api/directives/${directive.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: chatText.trim(),
          attachment: chatAttachment,
          requires_response: requiresResponse,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setBanner({ type: "err", text: data.error || "Failed to post message." });
      } else {
        setComments((prev) => [...prev, data.comment]);
        setChatText("");
        setChatAttachment(null);
        setDirective((prev) => ({
          ...prev,
          sla_due_at: data.sla_due_at,
          last_comment_at: new Date().toISOString(),
          status:
            prev.status === "completed" || prev.status === "closed"
              ? prev.status
              : requiresResponse
              ? "awaiting_response"
              : "in_progress",
        }));
        setNowMs(Date.now());
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      }
    } finally {
      setSendingChat(false);
    }
  }

  return (
    <div className="space-y-6">
      {banner && (
        <div
          className={`rounded-xl border p-3.5 text-xs font-medium flex items-center justify-between gap-2 ${
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

      {/* Top Navigation & Official Export Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Link
              href="/directives"
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground font-semibold"
            >
              <IconArrowLeft size={13} />
              All Directives
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="font-mono font-bold text-accent">
              {directive.reference_code}
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-foreground">
            {directive.title}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              <IconBuilding size={13} />
              {directive.department}
            </span>
            {directive.due_date && (
              <span className="inline-flex items-center gap-1">
                <IconCalendar size={13} />
                Due {directive.due_date}
              </span>
            )}
            <span>Issued by {directive.created_by_name || "Office of Direction"}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isPrivileged && (
            <select
              value={directive.status}
              onChange={(e) => handleStatusUpdate(e.target.value as DirectiveStatus)}
              className="h-9 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground"
            >
              <option value="open">Status: Open</option>
              <option value="in_progress">Status: In Progress</option>
              <option value="awaiting_response">Status: Awaiting Response</option>
              <option value="completed">Status: Completed</option>
              <option value="closed">Status: Closed</option>
            </select>
          )}
          <a
            href={`/api/directives/${directive.id}/export?format=pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"
          >
            <IconPrinter size={13} />
            PDF Letterhead
          </a>
          <a
            href={`/api/directives/${directive.id}/export?format=docx`}
            download
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            <IconDownload size={13} />
            DOCX Letterhead
          </a>
        </div>
      </div>

      {/* Main Split Grid: Left (Details + Multi-Tasks) | Right (Contextual Chat + SLA Timer) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (7 cols) */}
        <div className="xl:col-span-7 space-y-6">
          {/* AI Synthesized Executive Summary */}
          <div className="rounded-xl border border-accent/30 bg-accent/5 p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
                <IconSparkles size={15} className="text-accent" />
                AI Executive Summary
              </h2>
              {isPrivileged && directive.directions.length > 0 && (
                <button
                  type="button"
                  disabled={resummarizing}
                  onClick={handleRegenerateSummary}
                  className="text-[11px] font-semibold text-accent hover:underline disabled:opacity-50 cursor-pointer"
                >
                  {resummarizing ? "Refreshing..." : "Re-Summarize"}
                </button>
              )}
            </div>
            <p className="text-xs sm:text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
              {directive.executive_summary || "No executive summary recorded."}
            </p>
          </div>

          {/* Issued Directions */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3 shadow-xs">
            <h2 className="font-display text-sm font-bold text-foreground">
              Issued Directions ({directive.directions.length})
            </h2>
            {directive.directions.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                This directive was submitted via uploaded document attachment.
              </p>
            ) : (
              <ol className="space-y-2.5">
                {directive.directions.map((pt, idx) => (
                  <li
                    key={idx}
                    className="rounded-lg border border-border bg-muted/25 p-3.5 text-xs space-y-1.5"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      <p className="font-medium text-foreground leading-relaxed flex-1">
                        {pt.text}
                      </p>
                    </div>
                    {(pt.owner || pt.due_date) && (
                      <div className="flex flex-wrap gap-3 pl-7 text-[11px] text-muted-foreground">
                        {pt.owner && <span>Owner: {pt.owner}</span>}
                        {pt.due_date && <span>Target: {pt.due_date}</span>}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            )}

            {directive.attachments.length > 0 && (
              <div className="pt-3 border-t border-border space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Official Attachments
                </p>
                <div className="flex flex-wrap gap-2">
                  {directive.attachments.map((att) => (
                    <a
                      key={att.id}
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                    >
                      <IconPaperclip size={12} className="text-accent" />
                      {att.file_name}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Concurrent Multi-Tasking Panel */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
                  <IconCheckSquare size={15} className="text-accent" />
                  Concurrent Tasks ({completedTasksCount}/{tasks.length} Completed)
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  Track multiple parallel action items assigned under this directive.
                </p>
              </div>
              {isPrivileged && (
                <button
                  type="button"
                  onClick={() => setShowAddTask((v) => !v)}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 cursor-pointer"
                >
                  <IconPlus size={12} />
                  Add Task(s)
                </button>
              )}
            </div>

            {tasks.length > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-muted-foreground tabular-nums">
                  <span>Execution Progress</span>
                  <span className="font-bold text-foreground">{taskPct}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${taskPct}%` }}
                  />
                </div>
              </div>
            )}

            {showAddTask && isPrivileged && (
              <form
                onSubmit={handleAddConcurrentTasks}
                className="rounded-xl border border-border bg-muted/30 p-4 space-y-3"
              >
                <input
                  type="text"
                  required
                  placeholder="Concurrent task title *"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground"
                />
                <textarea
                  rows={2}
                  placeholder="Deliverable details (optional)"
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                    className="rounded-lg border border-border bg-card px-2.5 py-2 text-xs text-foreground"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent</option>
                  </select>
                  <input
                    type="date"
                    value={taskDue}
                    onChange={(e) => setTaskDue(e.target.value)}
                    className="rounded-lg border border-border bg-card px-2.5 py-2 text-xs text-foreground"
                  />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-foreground mb-1.5">
                    Assign to Staff (Multi-Select: {taskAssigneeIds.length} selected)
                  </p>
                  <div className="max-h-32 overflow-y-auto rounded-lg border border-border bg-card p-2 space-y-1">
                    {users.map((u) => {
                      const checked = taskAssigneeIds.includes(u.id);
                      return (
                        <label
                          key={u.id}
                          className="flex items-center gap-2 text-xs px-1.5 py-1 rounded hover:bg-muted/50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleTaskAssignee(u.id)}
                            className="h-3.5 w-3.5 accent-primary"
                          />
                          <span className="font-medium text-foreground">{u.full_name}</span>
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            {u.department}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddTask(false)}
                    className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingTask || taskAssigneeIds.length === 0}
                    className="rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50 cursor-pointer"
                  >
                    {addingTask
                      ? "Creating..."
                      : `Create ${taskAssigneeIds.length} Task${taskAssigneeIds.length === 1 ? "" : "s"}`}
                  </button>
                </div>
              </form>
            )}

            {tasks.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3">
                No tasks assigned under this directive yet.
              </p>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => {
                  const canAct = task.assigned_to === currentUserId || isPrivileged;
                  const busy = busyTaskId === task.id;
                  return (
                    <div
                      key={task.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 p-3.5"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-xs font-bold ${
                              task.status === "completed"
                                ? "line-through text-muted-foreground"
                                : "text-foreground"
                            }`}
                          >
                            {task.title}
                          </span>
                          <span className="rounded-full bg-card border border-border px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                            {task.status.replace("_", " ")}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {task.assignee_name} ({task.assignee_department})
                          {task.due_date ? ` · Due ${task.due_date}` : ""}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {canAct && task.status === "pending" && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleTaskStatus(task, "in_progress")}
                            className="rounded-md border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-muted cursor-pointer"
                          >
                            Start
                          </button>
                        )}
                        {canAct && task.status !== "completed" && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleTaskStatus(task, "completed")}
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 cursor-pointer"
                          >
                            <IconCheck size={11} />
                            Done
                          </button>
                        )}
                        {canAct && task.status === "completed" && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleTaskStatus(task, "pending")}
                            className="rounded-md border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-muted cursor-pointer"
                          >
                            Reopen
                          </button>
                        )}
                        {isPrivileged && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleDeleteTask(task.id)}
                            className="rounded-md border border-rose-500/20 p-1 text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                            title="Delete task"
                          >
                            <IconTrash size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Linked Action Plans */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
                <IconTarget size={15} className="text-accent" />
                Submitted Action Plans ({linkedPlans.length})
              </h2>
              <Link
                href={`/plans?directive=${directive.id}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
              >
                <IconPlus size={12} />
                Submit Plan for Directive
              </Link>
            </div>
            {linkedPlans.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No action plans linked to this directive yet.
              </p>
            ) : (
              <div className="space-y-2">
                {linkedPlans.map((pl) => (
                  <Link
                    key={pl.id}
                    href={`/plans/${pl.id}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 p-3 hover:bg-muted/40 transition-colors"
                  >
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        <span className="font-mono text-accent mr-1.5">{pl.reference_code}</span>
                        {pl.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {pl.author_name} · {pl.department} · {pl.period_start} to {pl.period_end}
                      </p>
                    </div>
                    <span className="rounded-full bg-card border border-border px-2 py-0.5 text-[10px] font-bold uppercase text-foreground">
                      {pl.status.replace("_", " ")}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (5 cols): Contextual In-App Chat + SLA Countdown */}
        <div className="xl:col-span-5 rounded-xl border border-border bg-card shadow-xs flex flex-col overflow-hidden xl:sticky xl:top-20 max-h-[760px]">
          {/* Chat Header + SLA Timer */}
          <div className="border-b border-border px-4 py-3.5 bg-muted/30 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <IconMessageSquare size={16} className="text-accent" />
                <h2 className="font-display text-sm font-bold text-foreground">
                  Directive Discussion Thread
                </h2>
              </div>
              <span className="text-[10px] font-semibold text-muted-foreground">
                SLA Window: {directive.sla_days}d
              </span>
            </div>

            {slaState ? (
              <div
                className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${
                  slaState.overdue
                    ? "border-rose-500/35 bg-rose-500/15 text-rose-800 dark:text-rose-200"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200"
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  {slaState.overdue ? (
                    <IconAlertCircle size={14} />
                  ) : (
                    <IconClock size={14} />
                  )}
                  Response SLA Countdown
                </span>
                <span className="font-mono tabular-nums">{slaState.label}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-[11px] text-muted-foreground">
                <IconCheckCircle size={13} className="text-emerald-600 dark:text-emerald-400" />
                {isClosed
                  ? "Directive closed — SLA timer stopped."
                  : `Posting a comment starts a ${directive.sla_days}-day response SLA countdown.`}
              </div>
            )}
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[280px]">
            {comments.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No discussion messages yet. Start the follow-up conversation below.
              </div>
            ) : (
              comments.map((c) => {
                const isMine = c.user_id === currentUserId;
                const roleLabel =
                  c.author_role === "super_admin"
                    ? "Direction"
                    : c.author_role === "admin"
                    ? "Admin"
                    : "Staff";

                return (
                  <div
                    key={c.id}
                    className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[90%] rounded-xl border px-3.5 py-2.5 text-xs space-y-1.5 ${
                        isMine
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/40 text-foreground border-border"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 text-[10px] opacity-80">
                        <span className="font-bold">
                          {c.author_name} · {roleLabel}
                        </span>
                        <span suppressHydrationWarning>{formatDate(c.created_at)}</span>
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed">{c.message}</p>
                      {c.attachment && (
                        <a
                          href={c.attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold underline ${
                            isMine ? "bg-white/15" : "bg-card border border-border"
                          }`}
                        >
                          <IconFileText size={11} />
                          {c.attachment.file_name}
                        </a>
                      )}
                      {c.requires_response && c.sla_deadline_at && (
                        <div className="text-[10px] opacity-75 pt-0.5 flex items-center gap-1">
                          <IconClock size={10} />
                          {c.responded_at
                            ? "Responded ✓"
                            : `Reply due by ${c.sla_deadline_at.slice(0, 10)}`}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Composer */}
          <form
            onSubmit={handleSendComment}
            className="border-t border-border p-3.5 bg-muted/20 space-y-2.5"
          >
            {chatAttachment && (
              <div className="flex items-center justify-between rounded-md border border-border bg-card px-2.5 py-1.5 text-[11px]">
                <span className="inline-flex items-center gap-1.5 truncate">
                  <IconPaperclip size={11} className="text-accent" />
                  {chatAttachment.file_name}
                </span>
                <button
                  type="button"
                  onClick={() => setChatAttachment(null)}
                  className="text-muted-foreground hover:text-rose-500 cursor-pointer"
                >
                  <IconX size={12} />
                </button>
              </div>
            )}

            <textarea
              rows={2}
              placeholder="Write a follow-up update, question, or directive response..."
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              className="w-full rounded-lg border border-border bg-card p-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-accent focus:outline-none"
            />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer">
                  <IconPaperclip size={13} />
                  {uploadingChatFile ? "Uploading..." : "Attach"}
                  <input
                    type="file"
                    className="hidden"
                    disabled={uploadingChatFile}
                    onChange={handleChatUpload}
                  />
                </label>

                <label className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={requiresResponse}
                    onChange={(e) => setRequiresResponse(e.target.checked)}
                    className="h-3.5 w-3.5 accent-accent"
                  />
                  <span>Enforce {directive.sla_days}d SLA</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={sendingChat || (!chatText.trim() && !chatAttachment)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                <IconSend size={12} />
                {sendingChat ? "Posting..." : "Post Comment"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

