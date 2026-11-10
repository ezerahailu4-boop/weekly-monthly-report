export interface WeeklyKpiRow {
  kpi: string;
  target: string;
  performance: string;
  percentAchievement: string;
  remark: string;
}

export interface WeeklyIncompleteRow {
  activity: string;
  reason: string;
}

export interface WeeklyReportData {
  reportingWeekFrom: string;
  reportingWeekTo: string;
  preparedBy: string;
  executiveSummary: string;
  kpiRows: WeeklyKpiRow[];
  incompleteRows: WeeklyIncompleteRow[];
  challenges: string;
  prioritiesNextWeek: string;
  supportRequired: string;
}

export const emptyWeeklyKpiRow = (): WeeklyKpiRow => ({
  kpi: "",
  target: "",
  performance: "",
  percentAchievement: "",
  remark: "",
});

export const emptyWeeklyIncompleteRow = (): WeeklyIncompleteRow => ({
  activity: "",
  reason: "",
});

export const emptyWeeklyReport = (): WeeklyReportData => ({
  reportingWeekFrom: "",
  reportingWeekTo: "",
  preparedBy: "",
  executiveSummary: "",
  kpiRows: [emptyWeeklyKpiRow()],
  incompleteRows: [emptyWeeklyIncompleteRow()],
  challenges: "",
  prioritiesNextWeek: "",
  supportRequired: "",
});

export interface MonthlyGoalRow {
  plannedActivity: string;
  kpi: string;
  target: string;
  actualPerformance: string;
  percentage: string;
  remarks: string;
}

export const emptyMonthlyGoalRow = (): MonthlyGoalRow => ({
  plannedActivity: "",
  kpi: "",
  target: "",
  actualPerformance: "",
  percentage: "",
  remarks: "",
});

export interface MonthlyReportData {
  statusOfDirections: string;
  executiveSummary: string;
  goalRows: MonthlyGoalRow[];
  additionalActivitiesPerformed: string;
  activitiesPlannedNotExecuted: string;
  challengeEncountered: string;
  actionTaken: string;
  supportAndFollowUp: string;
  focusAreasNextMonth: string;
}

export const emptyMonthlyReport = (): MonthlyReportData => ({
  statusOfDirections: "",
  executiveSummary: "",
  goalRows: [emptyMonthlyGoalRow()],
  additionalActivitiesPerformed: "",
  activitiesPlannedNotExecuted: "",
  challengeEncountered: "",
  actionTaken: "",
  supportAndFollowUp: "",
  focusAreasNextMonth: "",
});

export type ReportType = "weekly" | "monthly";

export type ReportStatus = "draft" | "submitted" | "reviewed";

export interface ReportRow {
  id: string;
  user_id: string;
  report_type: ReportType;
  period_start: string;
  period_end: string;
  status: ReportStatus;
  data: WeeklyReportData | MonthlyReportData;
  created_at: string;
  updated_at: string;
  author_name?: string | null;
  author_department?: string | null;
  author_email?: string | null;
  review_notes?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  reviewer_name?: string | null;
  profiles?: { full_name: string | null; department?: string | null } | null;
}
