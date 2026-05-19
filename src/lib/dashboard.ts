import type { SupabaseClient } from "@supabase/supabase-js";

import { STATUS_ORDER } from "@/lib/constants";
import type { Database, TicketPriority, TicketStatus } from "@/types/database";
import type { ProjectSummary } from "@/lib/projects";

type Supabase = SupabaseClient<Database>;

export type DashboardTicket = {
  id: string;
  ticket_number: number;
  title: string;
  status: TicketStatus;
  priority: TicketPriority;
  updated_at: string;
  due_date: string | null;
  assignee_id: string | null;
  project: Pick<ProjectSummary, "id" | "name" | "slug">;
};

export type DashboardStats = {
  projectCount: number;
  openTickets: number;
  assignedToMe: number;
  dueSoon: number;
};

export type StatusCount = {
  status: TicketStatus;
  count: number;
};

type RawTicketRow = {
  id: string;
  ticket_number: number;
  title: string;
  status: TicketStatus;
  priority: TicketPriority;
  updated_at: string;
  due_date: string | null;
  assignee_id: string | null;
  projects: Pick<ProjectSummary, "id" | "name" | "slug"> | null;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function dueSoonCutoffIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

export function computeDashboardStats(
  tickets: Pick<DashboardTicket, "status" | "assignee_id" | "due_date">[],
  userId: string,
  projectCount: number
): DashboardStats {
  const today = todayIso();
  const dueCutoff = dueSoonCutoffIso();

  let openTickets = 0;
  let assignedToMe = 0;
  let dueSoon = 0;

  for (const t of tickets) {
    if (t.status !== "done") {
      openTickets++;
      if (t.assignee_id === userId) assignedToMe++;
      if (t.due_date && t.due_date <= dueCutoff && t.due_date >= today)
        dueSoon++;
      if (t.due_date && t.due_date < today) dueSoon++;
    }
  }

  return { projectCount, openTickets, assignedToMe, dueSoon };
}

export function computeStatusCounts(
  tickets: Pick<DashboardTicket, "status">[]
): StatusCount[] {
  const counts = new Map<TicketStatus, number>();
  for (const status of STATUS_ORDER) {
    counts.set(status, 0);
  }
  for (const t of tickets) {
    counts.set(t.status, (counts.get(t.status) ?? 0) + 1);
  }
  return STATUS_ORDER.map((status) => ({
    status,
    count: counts.get(status) ?? 0,
  }));
}

export async function getDashboardTickets(
  supabase: Supabase,
  projectIds: string[]
): Promise<DashboardTicket[]> {
  if (projectIds.length === 0) return [];

  const { data } = await supabase
    .from("tickets")
    .select(
      `
      id,
      ticket_number,
      title,
      status,
      priority,
      updated_at,
      due_date,
      assignee_id,
      projects!inner(id, name, slug)
    `
    )
    .in("project_id", projectIds)
    .order("updated_at", { ascending: false });

  return ((data as RawTicketRow[] | null) ?? [])
    .filter((row) => row.projects != null)
    .map((row) => ({
      id: row.id,
      ticket_number: row.ticket_number,
      title: row.title,
      status: row.status,
      priority: row.priority,
      updated_at: row.updated_at,
      due_date: row.due_date,
      assignee_id: row.assignee_id,
      project: row.projects!,
    }));
}
