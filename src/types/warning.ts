import type { ReportType } from "./report";

export type WarningLevel = "verbal_warning" | "written_letter";
export type WarningStatus = "active" | "acknowledged" | "revoked";
export type WarningTriggerSource = "auto" | "manual";

export interface DisciplinaryWarningRow {
  id: string;
  user_id: string;
  issued_by: string | null;
  report_type: ReportType;
  period_start: string;
  period_end: string;
  period_label: string;
  strike_number: number;
  warning_level: WarningLevel;
  letter_ref: string | null;
  letter_subject: string | null;
  letter_body: string | null;
  trigger_source: WarningTriggerSource;
  status: WarningStatus;
  acknowledged_at: string | null;
  telegram_sent_at: string | null;
  telegram_error: string | null;
  created_at: string;
  employee_name?: string | null;
  employee_email?: string | null;
  employee_department?: string | null;
  employee_telegram_chat_id?: string | null;
  issued_by_name?: string | null;
}

