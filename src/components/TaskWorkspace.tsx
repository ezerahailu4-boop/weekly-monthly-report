"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconAlertCircle,
  IconBell,
  IconBuilding,
  IconCalendar,
  IconCheck,
  IconCheckCircle,
  IconCheckSquare,
  IconChevronDown,
  IconClock,
  IconFileText,
  IconMinus,
  IconPlus,
  IconSearch,
  IconSend,
  IconTrash,
  IconUser,
  IconUsers,
  IconX,
} from "./Icons";
import { TelegramConnectCard } from "./TelegramConnectCard";
import { formatDate } from "@/lib/dateUtils";
import type { TaskPriority, TaskRow, TaskStatus } from "@/types/task";
import {
  Button,
  EmptyState,
  TablePagination,
} from "./ui";

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

  // Bulk task rows — each row has its own title/desc/priority/due_date
  interface TaskDraft {
    id: number;
    title: string;
    description: string;
    priority: TaskPriority;
    dueDate: string;
  }
  const nextDraftId = useRef(1);
  const [taskDrafts, setTaskDrafts] = useState<TaskDraft[]>([
    { id: 0, title: "", description: "", priority: "medium", dueDate: "" },
  ]);

  // Multi-select assignees
  const [selectedAssignees, setSelectedAssignees] = useState<Set<string>>(new Set());
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const assigneeDropdownRef = useRef<HTMLDivElement>(null);

  const [notifyTelegram, setNotifyTelegram] = useState(true);
  const [creating, setCreating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);

  // Close assignee dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        assigneeDropdownRef.current &&
        !assigneeDropdownRef.current.contains(e.target as Node)
      ) {
        setShowAssigneeDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered users for the assignee picker
  const filteredAssigneeUsers = useMemo(() => {
    const q = assigneeSearch.toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.full_name.toLowerCase().includes(q) ||
        u.department.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }, [users, assigneeSearch]);

  // Group users by department for the assignee picker
  const departmentGroups = useMemo(() => {
    const groups = new Map<string, AssignableUser[]>();
    for (const u of filteredAssigneeUsers) {
      const dept = u.department || "Other";
      if (!groups.has(dept)) groups.set(dept, []);
      groups.get(dept)!.push(u);
    }
    return groups;
  }, [filteredAssigneeUsers]);

  function toggleAssignee(userId: string) {
    setSelectedAssignees((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function toggleAllAssignees() {
    if (selectedAssignees.size === filteredAssigneeUsers.length) {
      setSelectedAssignees(new Set());
    } else {
      setSelectedAssignees(new Set(filteredAssigneeUsers.map((u) => u.id)));
    }
  }

  function toggleDepartment(dept: string) {
    const deptUsers = departmentGroups.get(dept) || [];
    const allSelected = deptUsers.every((u) => selectedAssignees.has(u.id));
    setSelectedAssignees((prev) => {
      const next = new Set(prev);
      for (const u of deptUsers) {
        if (allSelected) next.delete(u.id);
        else next.add(u.id);
      }
      return next;
    });
  }

  function addTaskDraft() {
    nextDraftId.current += 1;
    setTaskDrafts((prev) => [
      ...prev,
      { id: nextDraftId.current, title: "", description: "", priority: "medium", dueDate: "" },
    ]);
  }

  function removeTaskDraft(id: number) {
    setTaskDrafts((prev) => (prev.length <= 1 ? prev : prev.filter((d) => d.id !== id)));
  }

  function updateTaskDraft(id: number, field: keyof Omit<TaskDraft, "id">, value: string) {
    setTaskDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [field]: value } : d))
    );
  }

  function resetCreateModal() {
    setShowCreateModal(false);
    nextDraftId.current = 1;
    setTaskDrafts([{ id: 0, title: "", description: "", priority: "medium", dueDate: "" }]);
    setSelectedAssignees(new Set());
    setAssigneeSearch("");
    setBulkProgress(null);
  }

  function loadDemoTasks() {
    setTaskDrafts([
      { id: 0, title: "Complete weekly fleet inspection", description: "Inspect assigned vehicles, record safety issues, and upload the checklist.", priority: "high", dueDate: todayEthDate },
      { id: 1, title: "Submit supplier delivery update", description: "Confirm delivery status and report any delays to Operations.", priority: "medium", dueDate: todayEthDate },
    ]);
  }

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

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / pageSize));
  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTasks.slice(start, start + pageSize);
  }, [filteredTasks, currentPage, pageSize]);

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
    if (selectedAssignees.size === 0) {
      setBanner({ type: "err", text: "Select at least one assignee." });
      return;
    }

    const validDrafts = taskDrafts.filter((d) => d.title.trim());
    if (validDrafts.length === 0) {
      setBanner({ type: "err", text: "Add at least one task with a title." });
      return;
    }

    setCreating(true);
    setBanner(null);
    const totalToCreate = validDrafts.length * selectedAssignees.size;
    setBulkProgress({ current: 0, total: totalToCreate });

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks: validDrafts.map((d) => ({
            title: d.title,
            description: d.description,
            priority: d.priority,
            due_date: d.dueDate || null,
          })),
          assigned_to: Array.from(selectedAssignees),
          notify_telegram: notifyTelegram,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setBanner({ type: "err", text: data.error || "Failed to assign tasks." });
      } else {
        // Prepend all new tasks
        setTasks((prev) => [...(data.tasks || []), ...prev]);
        resetCreateModal();

        const taskCount = data.created || totalToCreate;
        const telegramSent = data.telegram?.sent || 0;
        const telegramTotal = data.telegram?.total || 0;

        if (notifyTelegram && telegramTotal > 0) {
          if (telegramSent === telegramTotal) {
            setBanner({
              type: "ok",
              text: `${taskCount} task${taskCount > 1 ? "s" : ""} assigned successfully! All ${telegramSent} Telegram notification${telegramSent > 1 ? "s" : ""} delivered.`,
            });
          } else {
            setBanner({
              type: "warn",
              text: `${taskCount} task${taskCount > 1 ? "s" : ""} created. ${telegramSent}/${telegramTotal} Telegram notification${telegramTotal > 1 ? "s" : ""} delivered.`,
            });
          }
        } else {
          setBanner({
            type: "ok",
            text: `${taskCount} task${taskCount > 1 ? "s" : ""} assigned successfully!`,
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
      setBulkProgress(null);
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
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-brand"
              : banner.type === "warn"
              ? "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-accent"
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
            <Button
              variant="brand"
              size="sm"
              leftIcon={<IconPlus size={14} />}
              onClick={() => setShowCreateModal(true)}
            >
              Assign Tasks
            </Button>
          )}
        </div>
      </div>

      {/* Task Cards List */}
      {filteredTasks.length === 0 ? (
        <EmptyState
          title="No tasks found"
          description={
            search || statusFilter !== "all"
              ? "Try clearing your search or status filter."
              : isPrivileged
              ? "Assign a new task to a registered staff member to notify them via Telegram."
              : "You have no pending tasks right now."
          }
          actionLabel={isPrivileged ? "Assign New Task" : undefined}
          onAction={isPrivileged ? () => setShowCreateModal(true) : undefined}
        />
      ) : (
        <div className="space-y-3">
          {paginatedTasks.map((task) => {
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

                      {task.directive_id && task.directive_ref && (
                        <Link
                          href={`/directives/${task.directive_id}`}
                          className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent border border-accent/25 hover:bg-accent/20 transition-colors"
                          title={task.directive_title || "Open linked directive"}
                        >
                          Directive {task.directive_ref}
                        </Link>
                      )}

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

          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredTasks.length}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>
      )}

      {/* Bulk Assign Tasks Modal (Admin / Super Admin) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in-50">
          <div className="w-full max-w-2xl max-h-[90vh] rounded-xl border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <IconCheckSquare size={16} />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-foreground">
                    Assign Tasks
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Create multiple tasks for multiple staff members at once.
                  </p>
                </div>
                <button type="button" onClick={loadDemoTasks} className="ml-auto mr-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"><IconFileText size={14} />Load demo</button>
              </div>
              <button
                type="button"
                onClick={resetCreateModal}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <IconX size={16} />
              </button>
            </div>

            {/* Scrollable content */}
            <form onSubmit={handleCreateTask} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

                {/* ─── SECTION 1: Assign To (Multi-select) ─── */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-2">
                    <IconUsers size={14} className="text-muted-foreground" />
                    Assign To *
                    {selectedAssignees.size > 0 && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                        {selectedAssignees.size} selected
                      </span>
                    )}
                  </label>

                  <div ref={assigneeDropdownRef} className="relative">
                    {/* Selected users preview / trigger */}
                    <button
                      type="button"
                      onClick={() => setShowAssigneeDropdown((v) => !v)}
                      className="w-full flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5 text-xs text-foreground hover:bg-muted/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-colors"
                    >
                      <span className={selectedAssignees.size === 0 ? "text-muted-foreground/60" : ""}>
                        {selectedAssignees.size === 0
                          ? "Click to select staff members..."
                          : selectedAssignees.size === users.length
                          ? `All ${users.length} staff selected`
                          : `${selectedAssignees.size} staff member${selectedAssignees.size > 1 ? "s" : ""} selected`}
                      </span>
                      <IconChevronDown
                        size={14}
                        className={`text-muted-foreground transition-transform ${showAssigneeDropdown ? "rotate-180" : ""}`}
                      />
                    </button>

                    {/* Selected pills (show first 6) */}
                    {selectedAssignees.size > 0 && !showAssigneeDropdown && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {users
                          .filter((u) => selectedAssignees.has(u.id))
                          .slice(0, 6)
                          .map((u) => (
                            <span
                              key={u.id}
                              className="inline-flex items-center gap-1 rounded-full bg-primary/8 border border-primary/15 px-2 py-0.5 text-[10px] font-medium text-foreground"
                            >
                              {u.full_name}
                              {u.telegram_chat_id && (
                                <span className="text-emerald-500" title="Telegram linked">✓</span>
                              )}
                              <button
                                type="button"
                                onClick={() => toggleAssignee(u.id)}
                                className="text-muted-foreground hover:text-rose-500 ml-0.5"
                              >
                                <IconX size={10} />
                              </button>
                            </span>
                          ))}
                        {selectedAssignees.size > 6 && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            +{selectedAssignees.size - 6} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Dropdown panel */}
                    {showAssigneeDropdown && (
                      <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-card shadow-xl max-h-64 flex flex-col animate-in slide-in-from-top-1 duration-100">
                        {/* Search + select all */}
                        <div className="border-b border-border p-2 space-y-1.5 shrink-0">
                          <div className="relative">
                            <IconSearch
                              size={13}
                              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                            />
                            <input
                              type="text"
                              placeholder="Search by name, department..."
                              value={assigneeSearch}
                              onChange={(e) => setAssigneeSearch(e.target.value)}
                              className="w-full rounded-md border border-border bg-muted/40 py-1.5 pl-8 pr-2 text-[11px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                              autoFocus
                            />
                          </div>
                          <button
                            type="button"
                            onClick={toggleAllAssignees}
                            className="text-[11px] font-semibold text-primary hover:underline"
                          >
                            {selectedAssignees.size === filteredAssigneeUsers.length
                              ? "Deselect All"
                              : `Select All (${filteredAssigneeUsers.length})`}
                          </button>
                        </div>

                        {/* User list grouped by department */}
                        <div className="overflow-y-auto flex-1">
                          {Array.from(departmentGroups.entries()).map(([dept, deptUsers]) => {
                            const allInDeptSelected = deptUsers.every((u) =>
                              selectedAssignees.has(u.id)
                            );
                            return (
                              <div key={dept}>
                                <button
                                  type="button"
                                  onClick={() => toggleDepartment(dept)}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/30 hover:bg-muted/50"
                                >
                                  <span
                                    className={`flex h-3.5 w-3.5 items-center justify-center rounded border text-[9px] ${
                                      allInDeptSelected
                                        ? "border-primary bg-primary text-primary-foreground"
                                        : "border-border"
                                    }`}
                                  >
                                    {allInDeptSelected && <IconCheck size={9} />}
                                  </span>
                                  {dept} ({deptUsers.length})
                                </button>
                                {deptUsers.map((u) => {
                                  const isSelected = selectedAssignees.has(u.id);
                                  return (
                                    <button
                                      key={u.id}
                                      type="button"
                                      onClick={() => toggleAssignee(u.id)}
                                      className={`flex w-full items-center gap-2.5 px-4 py-2 text-xs hover:bg-muted/50 transition-colors ${
                                        isSelected ? "bg-primary/5" : ""
                                      }`}
                                    >
                                      <span
                                        className={`flex h-4 w-4 items-center justify-center rounded border shrink-0 ${
                                          isSelected
                                            ? "border-primary bg-primary text-primary-foreground"
                                            : "border-border"
                                        }`}
                                      >
                                        {isSelected && <IconCheck size={10} />}
                                      </span>
                                      <span className="flex-1 text-left truncate font-medium text-foreground">
                                        {u.full_name}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground shrink-0">
                                        {u.role}
                                      </span>
                                      {u.telegram_chat_id ? (
                                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
                                          TG ✓
                                        </span>
                                      ) : (
                                        <span className="text-[9px] text-muted-foreground/60 shrink-0">
                                          No TG
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            );
                          })}
                          {filteredAssigneeUsers.length === 0 && (
                            <p className="p-4 text-center text-xs text-muted-foreground">
                              No staff found matching &quot;{assigneeSearch}&quot;
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ─── SECTION 2: Tasks (Dynamic rows) ─── */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <IconCheckSquare size={14} className="text-muted-foreground" />
                      Tasks *
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                        {taskDrafts.length}
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={addTaskDraft}
                      disabled={taskDrafts.length >= 20}
                      className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-muted/80 transition-colors disabled:opacity-40"
                    >
                      <IconPlus size={12} />
                      Add Task
                    </button>
                  </div>

                  <div className="space-y-3">
                    {taskDrafts.map((draft, idx) => (
                      <div
                        key={draft.id}
                        className="rounded-lg border border-border bg-muted/20 p-3 space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Task {idx + 1}
                          </span>
                          {taskDrafts.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeTaskDraft(draft.id)}
                              className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            >
                              <IconMinus size={10} />
                              Remove
                            </button>
                          )}
                        </div>

                        <input
                          type="text"
                          required
                          placeholder="Task title *"
                          value={draft.title}
                          onChange={(e) => updateTaskDraft(draft.id, "title", e.target.value)}
                          className="w-full rounded-md border border-border bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                        />

                        <textarea
                          rows={2}
                          placeholder="Instructions / details (optional)"
                          value={draft.description}
                          onChange={(e) => updateTaskDraft(draft.id, "description", e.target.value)}
                          className="w-full rounded-md border border-border bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                        />

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-semibold text-muted-foreground mb-0.5">
                              Priority
                            </label>
                            <select
                              value={draft.priority}
                              onChange={(e) =>
                                updateTaskDraft(draft.id, "priority", e.target.value)
                              }
                              className="w-full rounded-md border border-border bg-card px-2 py-1.5 text-xs text-foreground focus:border-accent focus:outline-none"
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                              <option value="urgent">Urgent</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-muted-foreground mb-0.5">
                              Due Date
                            </label>
                            <input
                              type="date"
                              value={draft.dueDate}
                              onChange={(e) =>
                                updateTaskDraft(draft.id, "dueDate", e.target.value)
                              }
                              className="w-full rounded-md border border-border bg-card px-2 py-1.5 text-xs text-foreground focus:border-accent focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ─── SECTION 3: Telegram toggle ─── */}
                <label className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyTelegram}
                    onChange={(e) => setNotifyTelegram(e.target.checked)}
                    className="h-4 w-4 rounded border-border accent-emerald-600"
                  />
                  <span className="font-medium text-foreground">
                    Send instant Telegram notification to all assignees
                  </span>
                </label>

                {/* ─── Summary ─── */}
                {selectedAssignees.size > 0 && taskDrafts.some((d) => d.title.trim()) && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
                    <p className="font-semibold text-foreground flex items-center gap-1.5">
                      <IconSend size={12} className="text-primary" />
                      Assignment Summary
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      <span className="font-bold text-foreground">
                        {taskDrafts.filter((d) => d.title.trim()).length}
                      </span>
                      {" task"}
                      {taskDrafts.filter((d) => d.title.trim()).length > 1 ? "s" : ""} ×{" "}
                      <span className="font-bold text-foreground">
                        {selectedAssignees.size}
                      </span>
                      {" assignee"}
                      {selectedAssignees.size > 1 ? "s" : ""} ={" "}
                      <span className="font-bold text-primary">
                        {taskDrafts.filter((d) => d.title.trim()).length * selectedAssignees.size}
                      </span>
                      {" total task"}
                      {taskDrafts.filter((d) => d.title.trim()).length * selectedAssignees.size > 1
                        ? "s"
                        : ""}{" "}
                      will be created
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between gap-2 border-t border-border px-6 py-4 shrink-0 bg-card">
                {bulkProgress ? (
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{
                            width: `${
                              bulkProgress.total > 0
                                ? (bulkProgress.current / bulkProgress.total) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                      <span className="tabular-nums font-medium">
                        Creating...
                      </span>
                    </div>
                  </div>
                ) : (
                  <div />
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={resetCreateModal}
                    className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating || selectedAssignees.size === 0}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    <IconSend size={13} />
                    {creating
                      ? "Assigning..."
                      : selectedAssignees.size > 1 || taskDrafts.length > 1
                      ? `Assign ${
                          taskDrafts.filter((d) => d.title.trim()).length * selectedAssignees.size
                        } Task${
                          taskDrafts.filter((d) => d.title.trim()).length * selectedAssignees.size > 1
                            ? "s"
                            : ""
                        }`
                      : "Assign & Notify"}
                  </button>
                </div>
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

