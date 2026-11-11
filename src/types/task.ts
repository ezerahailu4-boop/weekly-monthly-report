export type TaskStatus = "pending" | "in_progress" | "completed";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface TaskRow {
  id: string;
  title: string;
  description: string;
  assigned_to: string;
  assigned_by: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  completion_note: string | null;
  completed_at: string | null;
  telegram_notified_at: string | null;
  telegram_error: string | null;
  created_at: string;
  updated_at: string;
  assignee_name?: string | null;
  assignee_email?: string | null;
  assignee_department?: string | null;
  assignee_telegram_chat_id?: string | null;
  assigned_by_name?: string | null;
}

