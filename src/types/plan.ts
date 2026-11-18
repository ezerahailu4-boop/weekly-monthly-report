import type { DataEntryMode, FileAttachmentMeta } from "./directive";

export type ActionPlanStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "revision_requested"
  | "completed";

export interface ActionPlanObjective {
  activity: string;
  kpi: string;
  owner: string;
  targetDate: string;
  resources: string;
  progress: number;
  status: "not_started" | "in_progress" | "completed" | "delayed";
}

export const emptyActionPlanObjective = (): ActionPlanObjective => ({
  activity: "",
  kpi: "",
  owner: "",
  targetDate: "",
  resources: "",
  progress: 0,
  status: "not_started",
});

export interface ActionPlanRow {
  id: string;
  reference_code: string;
  user_id: string;
  directive_id: string | null;
  directive_ref?: string | null;
  directive_title?: string | null;
  title: string;
  department: string;
  period_start: string;
  period_end: string;
  entry_mode: DataEntryMode;
  objectives: ActionPlanObjective[];
  summary: string;
  attachments: FileAttachmentMeta[];
  status: ActionPlanStatus;
  review_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  author_name?: string | null;
  author_email?: string | null;
  reviewer_name?: string | null;
  created_at: string;
  updated_at: string;
}

