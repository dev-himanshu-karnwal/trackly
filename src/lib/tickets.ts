import type {
  TicketPriority,
  TicketStatus,
  TicketType,
} from "@/types/database";

/** Display ID e.g. TRK-001 */
export function formatTicketId(
  projectSlug: string,
  ticketNumber: number
): string {
  const slug = projectSlug.toUpperCase();
  return `${slug}-${String(ticketNumber).padStart(3, "0")}`;
}

/** Parse route param `[ticketNumber]` to integer; returns null if invalid */
export function parseTicketNumber(param: string): number | null {
  if (!/^\d+$/.test(param)) return null;
  const n = Number.parseInt(param, 10);
  return n >= 1 ? n : null;
}

export function canCreateTickets(role: string): boolean {
  return role === "admin" || role === "qa";
}

const PRIORITY_ORDER: Record<TicketPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function comparePriority(a: TicketPriority, b: TicketPriority): number {
  return PRIORITY_ORDER[a] - PRIORITY_ORDER[b];
}

export const TICKET_TYPES: TicketType[] = [
  "bug",
  "feature",
  "task",
  "improvement",
];

export const TICKET_STATUSES: TicketStatus[] = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "testing",
  "done",
];

export const TICKET_PRIORITIES: TicketPriority[] = [
  "low",
  "medium",
  "high",
  "critical",
];

export function statusBadgeClass(status: TicketStatus): string {
  const map: Record<TicketStatus, string> = {
    backlog: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    todo: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    in_progress:
      "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
    in_review:
      "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
    testing:
      "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    done: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  };
  return map[status];
}

/** Format a date-only value for `<input type="date">` (YYYY-MM-DD) */
export function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 10);
}

/** Parse optional date from form input; returns null when empty */
export function parseOptionalDate(
  raw: FormDataEntryValue | null
): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return value;
}

export function formatTicketDate(value: string | null | undefined): string {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function priorityBadgeClass(priority: TicketPriority): string {
  const map: Record<TicketPriority, string> = {
    low: "bg-zinc-100 text-zinc-600",
    medium: "bg-sky-100 text-sky-800",
    high: "bg-orange-100 text-orange-800",
    critical: "bg-red-100 text-red-800",
  };
  return map[priority];
}
