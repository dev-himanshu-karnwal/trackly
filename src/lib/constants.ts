export const STATUS_LABELS = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  testing: "Testing",
  done: "Done",
} as const;

export const STATUS_ORDER = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "testing",
  "done",
] as const;

export type TicketStatus = (typeof STATUS_ORDER)[number];

export const TYPE_LABELS = {
  bug: "Bug",
  feature: "Feature",
  task: "Task",
  improvement: "Improvement",
} as const;

export type TicketType = keyof typeof TYPE_LABELS;

export const PRIORITY_LABELS = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
} as const;

export type TicketPriority = keyof typeof PRIORITY_LABELS;

export const ROLE_LABELS = {
  admin: "Admin",
  qa: "QA",
  engineer: "Engineer",
} as const;

export type UserRole = keyof typeof ROLE_LABELS;

/** Preset hex colors for project labels (PRD palette). */
export const LABEL_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#64748b",
] as const;
