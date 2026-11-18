export type DirectivePriority = "low" | "medium" | "high" | "urgent";
export type DirectiveStatus =
  | "open"
  | "in_progress"
  | "awaiting_response"
  | "completed"
  | "closed";
export type DataEntryMode = "form" | "upload";

export interface DirectionPoint {
  text: string;
  owner?: string;
  due_date?: string;
}

export interface FileAttachmentMeta {
  id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  url: string;
}

export interface DirectiveRow {
  id: string;
  reference_code: string;
  title: string;
  department: string;
  priority: DirectivePriority;
  directions: DirectionPoint[];
  executive_summary: string;
  entry_mode: DataEntryMode;
  attachments: FileAttachmentMeta[];
  status: DirectiveStatus;
  due_date: string | null;
  sla_days: number;
  last_comment_at: string | null;
  sla_due_at: string | null;
  source_report_id: string | null;
  created_by: string | null;
  created_by_name?: string | null;
  created_at: string;
  updated_at: string;
  total_tasks?: number;
  completed_tasks?: number;
  comment_count?: number;
}

export interface DirectiveCommentRow {
  id: string;
  directive_id: string;
  user_id: string;
  author_name: string;
  author_role: "employee" | "admin" | "super_admin";
  author_department: string | null;
  message: string;
  attachment: FileAttachmentMeta | null;
  requires_response: boolean;
  sla_deadline_at: string | null;
  responded_at: string | null;
  created_at: string;
}

