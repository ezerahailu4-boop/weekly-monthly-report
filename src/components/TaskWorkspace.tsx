"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconAlertCircle,
  IconBell,
  IconBuilding,
  IconCalendar,
  IconCheck,
  IconCheckCircle,
  IconCheckSquare,
  IconClock,
  IconPlus,
  IconSearch,
  IconSend,
  IconTrash,
  IconUser,
  IconX,
} from "./Icons";
import { TelegramConnectCard } from "./TelegramConnectCard";
import { formatDate } from "@/lib/dateUtils";
import type { TaskPriority, TaskRow, TaskStatus } from "@/types/task";

export interface AssignableUser {
  id: string;
  full_name: string;
  email: string;
  department: string;
  role: string;
  telegram_chat_id?: string | null;
}

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  urgent: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
  high: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  medium: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  low: "bg-muted text-muted-foreground border-border",
};

const STATUS_STYLES: Record<TaskStatus, string> = {
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  in_progress: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
};

export function TaskWorkspace({
  initialTasks,
  users = [],
  currentUserId,
  isPrivileged = false,
  todayEthDate,
  showTelegramCard = true,
}: {
  initialTasks: TaskRow[];
  users?: AssignableUser[];
  currentUserId: string;
  isPrivileged?: boolean;
  todayEthDate: string;
  showTelegramCard?: boolean;
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskRow[]>(initialTasks);
  const [scopeFilter, setScopeFilter] = useState<"all" | "mine">(
    isPrivileged ? "all" : "mine"
  );
  const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Create Task modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newAssignee, setNewAssignee] = useState(users[0]?.id || "");
  const [newPriority, setNewPriority] = useState<TaskPriority>("medium");
  const [newDueDate, setNewDueDate] = useState("");
  const [notifyTelegram, setNotifyTelegram] = useState(true);
  const [creating, setCreating] = useState(false);

  // Complete Task modal state
  const [completingTask, setCompletingTask] = useState<TaskRow | null>(null);
  const [completionNote, setCompletionNote] = useState("");
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);

  const [banner, setBanner] = useState<{ type: "ok" | "warn" | "err"; text: string } | null>(
    null
  );

  const visibleScopeTasks =
    isPrivileged && scopeFilter === "all"
      ? tasks
      : tasks.filter((t) => t.assigned_to === currentUserId);

  const filteredTasks = visibleScopeTasks.filter((t) => {
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    const matchesAssignee =
      assigneeFilter === "all" || t.assigned_to === assigneeFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      (t.assignee_name || "").toLowerCase().includes(q) ||
      (t.assignee_department || "").toLowerCase().includes(q);
    return matchesStatus && matchesAssignee && matchesSearch;
  });

  const totalCount = visibleScopeTasks.length;
  const pendingCount = visibleScopeTasks.filter((t) => t.status === "pending").length;
  const inProgressCount = visibleScopeTasks.filter(
    (t) => t.status === "in_progress"
  ).length;
  const completedCount = visibleScopeTasks.filter(
    (t) => t.status === "completed"
  ).length;

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setBanner(null);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription,
          assigned_to: newAssignee,
          priority: newPriority,
          due_date: newDueDate || null,
          notify_telegram: notifyTelegram,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setBanner({ type: "err", text: data.error || "Failed to assign task." });
      } else {
        setTasks((prev) => [data.task, ...prev]);
        setShowCreateModal(false);
        setNewTitle("");
        setNewDescription("");
        setNewDueDate("");
        setNewPriority("medium");

        if (notifyTelegram) {
          if (data.telegram?.sent) {
            setBanner({
              type: "ok",
              text: `Task assigned to ${data.task.assignee_name} and Telegram notification delivered!`,
            });
          } else {
            setBanner({
              type: "warn",
              text: `Task created for ${data.task.assignee_name}, but Telegram alert was not sent (${
                data.telegram?.error || "user not linked yet"
              }).`,
            });
          }
        } else {
          setBanner({
            type: "ok",
            text: `Task assigned to ${data.task.assignee_name}.`,
          });
        }
        router.refresh();
      }
    } catch (err: unknown) {
      setBanner({
        type: "err",
        text: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      setCreating(false);
    }
  }

  async function handleStatusChange(
    task: TaskRow,
    newStatus: TaskStatus,
    note?: string
  ) {
    setBusyTaskId(task.id);
    setBanner(null);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          completion_note: note !== undefined ? note : task.completion_note,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setBanner({ type: "err", text: data.error || "Failed to update task." });
      } else {
        setTasks((prev) => prev.map((t) => (t.id === task.id ? data.task : t)));
        setCompletingTask(null);
        setCompletionNote("");
        if (newStatus === "completed") {
          setBanner({
            type: "ok",
            text: `Task "${task.title}" marked as completed!`,
          });
        }
        router.refresh();
      }
    } catch (err: unknown) {
      setBanner({
        type: "err",
        text: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      setBusyTaskId(null);
    }
  }

  async function handleResendTelegram(task: TaskRow) {
    setBusyTaskId(task.id);
    setBanner(null);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resend_telegram" }),
      });
      const data = await res.json();
      if (data.task) {
        setTasks((prev) => prev.map((t) => (t.id === task.id ? data.task : t)));
      }
      if (data.telegram?.sent) {
        setBanner({
          type: "ok",
          text: `Telegram notification sent to ${task.assignee_name}!`,
        });
      } else {
        setBanner({
          type: "warn",
          text: data.error || "Could not deliver Telegram alert.",
        });
      }
    } finally {
      setBusyTaskId(null);
    }
  }

  async function handleDeleteTask(task: TaskRow) {
    if (!confirm(`Delete task "${task.title}"? This cannot be undone.`)) return;
    setBusyTaskId(task.id);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== task.id));
        router.refresh();
      }
    } finally {
      setBusyTaskId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Feedback Banner */}
      {banner && (
        <div
          className={`rounded-xl border p-4 text-xs font-medium flex items-center justify-between gap-3 ${
            banner.type === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
              : banner.type === "warn"
              ? "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200"
              : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
          }`}
        >
          <span>{banner.text}</span>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="opacity-70 hover:opacity-100"
          >
            <IconX size={14} />
          </button>
        </div>
      )}

      {/* Optional Telegram Link Card */}
      {showTelegramCard && <TelegramConnectCard compact />}

      {/* 4 Task Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Tasks
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <IconCheckSquare size={16} />
            </div>
          </div>
          <p className="font-display text-2xl sm:text-3xl font-bold text-foreground mt-2 tabular-nums">
            {totalCount}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pending
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <IconClock size={16} />
            </div>
          </div>
          <p className="font-display text-2xl sm:text-3xl font-bold text-amber-700 dark:text-amber-300 mt-2 tabular-nums">
            {pendingCount}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              In Progress
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <IconAlertCircle size={16} />
            </div>
          </div>
          <p className="font-display text-2xl sm:text-3xl font-bold text-blue-700 dark:text-blue-300 mt-2 tabular-nums">
            {inProgressCount}
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
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <IconSearch
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="Search tasks, instructions, or assignee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>

          {isPrivileged && (
            <div className="inline-flex h-9 items-center rounded-lg bg-muted p-1 text-muted-foreground text-xs border border-border/60">
              <button
                type="button"
                onClick={() => setScopeFilter("all")}
                className={`rounded-md px-3 py-1 font-semibold transition-all ${
                  scopeFilter === "all"
                    ? "bg-card text-foreground shadow-2xs"
                    : "hover:text-foreground"
                }`}
              >
                All Assigned Tasks
              </button>
              <button
                type="button"
                onClick={() => setScopeFilter("mine")}
                className={`rounded-md px-3 py-1 font-semibold transition-all ${
                  scopeFilter === "mine"
                    ? "bg-card text-foreground shadow-2xs"
                    : "hover:text-foreground"
                }`}
              >
                My Tasks
              </button>
            </div>
          )}

          {isPrivileged && scopeFilter === "all" && users.length > 0 && (
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none"
            >
              <option value="all">All Registered Users</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name} ({u.department})
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Pills */}
          <div className="inline-flex h-9 items-center rounded-lg bg-muted p-1 text-muted-foreground text-xs border border-border/60">
            {(["all", "pending", "in_progress", "completed"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-md px-2.5 py-1 font-medium transition-all ${
                  statusFilter === s
                    ? "bg-card text-foreground shadow-2xs font-semibold"
                    : "hover:text-foreground"
                }`}
              >
                {s === "all" ? "All" : STATUS_LABELS[s]}
              </button>
            ))}
          </div>

          {isPrivileged && (
            <button
              type="button"
              onClick={() => {
                if (!newAssignee && users.length > 0) setNewAssignee(users[0].id);
                setShowCreateModal(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-xs hover:opacity-90 transition-all"
            >
              <IconPlus size={14} />
              Assign Task
            </button>
          )}
        </div>
      </div>

      {/* Task Cards List */}
      {filteredTasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card py-14 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <IconCheckSquare size={22} />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-foreground">
            No tasks found
          </h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            {search || statusFilter !== "all"
              ? "Try clearing your search or status filter."
              : isPrivileged
              ? "Assign a new task to a registered staff member to notify them via Telegram."
              : "You have no pending tasks right now."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const isOverdue =
              !!task.due_date &&
              task.status !== "completed" &&
              task.due_date < todayEthDate;
            const canActOnTask =
              task.assigned_to === currentUserId || isPrivileged;
            const isBusy = busyTaskId === task.id;

            return (
              <div
                key={task.id}
                className={`rounded-xl border bg-card p-5 shadow-xs transition-all hover:shadow-sm ${
                  task.status === "completed"
                    ? "border-border opacity-85"
                    : isOverdue
                    ? "border-rose-500/40"
                    : "border-border"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="space-y-2.5 flex-1 min-w-0">
                    {/* Badges Row */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                          STATUS_STYLES[task.status]
                        }`}
                      >
                        {STATUS_LABELS[task.status]}
                      </span>

                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase border ${
                          PRIORITY_STYLES[task.priority]
                        }`}
                      >
                        {task.priority}
                      </span>

                      {isOverdue && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-300 border border-rose-500/30">
                          Overdue
                        </span>
                      )}

                      {task.telegram_notified_at ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:text-sky-300 border border-sky-500/20">
                          <IconBell size={10} />
                          Telegram Sent
                        </span>
                      ) : isPrivileged ? (
                        <span
                          title={task.telegram_error || "Not sent via Telegram"}
                          className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground border border-border"
                        >
                          {task.assignee_telegram_chat_id
                            ? "Telegram Pending"
                            : "No Telegram Linked"}
                        </span>
                      ) : null}
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h3
                        className={`text-sm sm:text-base font-bold text-foreground ${
                          task.status === "completed" ? "line-through opacity-75" : ""
                        }`}
                      >
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className="mt-1 text-xs sm:text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                          {task.description}
                        </p>
                      )}
                    </div>

                    {/* Meta Info */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground pt-1 tabular-nums">
                      <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                        <IconUser size={12} className="text-muted-foreground" />
                        Assignee: {task.assignee_name || "Staff"}
                      </span>

                      {task.assignee_department && (
                        <span className="inline-flex items-center gap-1">
                          <IconBuilding size={12} />
                          {task.assignee_department}
                        </span>
                      )}

                      {task.due_date && (
                        <span
                          className={`inline-flex items-center gap-1 font-medium ${
                            isOverdue ? "text-rose-600 dark:text-rose-400 font-bold" : ""
                          }`}
                        >
                          <IconCalendar size={12} />
                          Due: {task.due_date}
                        </span>
                      )}

                      {task.assigned_by_name && (
                        <span>Assigned by {task.assigned_by_name}</span>
                      )}
                    </div>

                    {/* Completion Note if completed */}
                    {task.status === "completed" && (
                      <div className="mt-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs">
                        <p className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                          <IconCheckCircle size={13} />
                          Completed{" "}
                          {task.completed_at ? `on ${formatDate(task.completed_at)}` : ""}
                        </p>
                        {task.completion_note && (
                          <p className="mt-1 text-foreground/90 whitespace-pre-wrap">
                            {task.completion_note}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {canActOnTask && task.status === "pending" && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleStatusChange(task, "in_progress")}
                        className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                      >
                        Start Work
                      </button>
                    )}

                    {canActOnTask && task.status !== "completed" && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          setCompletingTask(task);
                          setCompletionNote(task.completion_note || "");
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs transition-all disabled:opacity-50"
                      >
                        <IconCheck size={13} />
                        Mark Completed
                      </button>
                    )}

                    {canActOnTask && task.status === "completed" && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleStatusChange(task, "pending")}
                        className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                      >
                        Reopen
                      </button>
                    )}

                    {isPrivileged && task.status !== "completed" && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleResendTelegram(task)}
                        title="Send or resend Telegram notification"
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                      >
                        <IconSend size={12} className="text-sky-500" />
                        Notify Telegram
                      </button>
                    )}

                    {isPrivileged && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleDeleteTask(task)}
                        title="Delete Task"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-500/20 bg-card text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
                      >
                        <IconTrash size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assign New Task Modal (Admin / Super Admin) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in-50">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <IconCheckSquare size={16} />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-foreground">
                    Assign Task to Registered User
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Assigns task directly and notifies the user via Telegram.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <IconX size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Assign To (Registered User) *
                </label>
                <select
                  required
                  value={newAssignee}
                  onChange={(e) => setNewAssignee(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} — {u.department} (
                      {u.telegram_chat_id ? "Telegram Linked ✓" : "No Telegram"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Submit Q4 Fleet Fuel Audit Sheet"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Instructions / Details
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe deliverables, context, or expected outcome..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Priority
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Due Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyTelegram}
                  onChange={(e) => setNotifyTelegram(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-emerald-600"
                />
                <span className="font-medium text-foreground">
                  Send instant Telegram notification to assignee
                </span>
              </label>

              <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  <IconSend size={13} />
                  {creating ? "Assigning..." : "Assign & Notify"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mark Completed Modal */}
      {completingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in-50">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <IconCheckCircle size={17} />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-foreground">
                    Complete Task
                  </h3>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">
                    {completingTask.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCompletingTask(null)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <IconX size={16} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleStatusChange(completingTask, "completed", completionNote);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Completion Note / Summary (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe what was completed, key output, or reference number..."
                  value={completionNote}
                  onChange={(e) => setCompletionNote(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card p-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setCompletingTask(null)}
                  className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busyTaskId === completingTask.id}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <IconCheck size={14} />
                  {busyTaskId === completingTask.id ? "Completing..." : "Confirm Completed"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

