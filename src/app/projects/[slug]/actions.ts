"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getProfile, requireAuth } from "@/lib/auth";
import { dispatchNotification } from "@/lib/notifications/notify";
import { canCreateTickets, parseOptionalDate } from "@/lib/tickets";
import type {
  TicketPriority,
  TicketStatus,
  TicketType,
} from "@/types/database";
import { createClient } from "@/utils/supabase/server";

async function getSupabase() {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}

async function getProjectForAction(slug: string) {
  const supabase = await getSupabase();
  const { data: project } = await supabase
    .from("projects")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (!project)
    return { error: "Project not found" as const, supabase, project: null };

  return { error: null, supabase, project };
}

async function getTicketByNumber(
  supabase: Awaited<ReturnType<typeof getSupabase>>,
  projectId: string,
  ticketNumber: number
) {
  const { data } = await supabase
    .from("tickets")
    .select(
      "id, ticket_number, title, assignee_id, created_by, project_id, status"
    )
    .eq("project_id", projectId)
    .eq("ticket_number", ticketNumber)
    .maybeSingle();

  return data;
}

function actorFromProfile(
  profile: NonNullable<Awaited<ReturnType<typeof getProfile>>>
) {
  return { id: profile.id, name: profile.name, email: profile.email };
}

function revalidateProject(slug: string, ticketNumber?: number) {
  revalidatePath(`/projects/${slug}`);
  if (ticketNumber != null) {
    revalidatePath(`/projects/${slug}/tickets/${ticketNumber}`);
    revalidatePath(`/projects/${slug}/tickets/${ticketNumber}/edit`);
  }
}

export type ActionResult = { error?: string; success?: boolean };

export async function createTicket(
  slug: string,
  formData: FormData
): Promise<ActionResult> {
  await requireAuth();
  const profile = await getProfile();
  if (!profile || !canCreateTickets(profile.role)) {
    return { error: "You do not have permission to create tickets" };
  }

  const { error, supabase, project } = await getProjectForAction(slug);
  if (error || !project) return { error: error ?? "Project not found" };

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const type = formData.get("type") as TicketType;
  const status = (formData.get("status") as TicketStatus) || "backlog";
  const priority = formData.get("priority") as TicketPriority;
  const assigneeRaw = formData.get("assignee_id");
  const assignee_id =
    assigneeRaw && String(assigneeRaw) !== "none" ? String(assigneeRaw) : null;
  const labelIds = formData.getAll("label_ids").map(String);
  const start_date = parseOptionalDate(formData.get("start_date"));
  const due_date = parseOptionalDate(formData.get("due_date"));

  if (!title) return { error: "Title is required" };
  if (start_date && due_date && start_date > due_date) {
    return { error: "Start date must be on or before due date" };
  }

  const { data: ticket, error: insertError } = await supabase
    .from("tickets")
    .insert({
      project_id: project.id,
      title,
      description,
      type,
      status,
      priority,
      assignee_id,
      start_date,
      due_date,
      created_by: profile.id,
    })
    .select("id, ticket_number")
    .single();

  if (insertError) return { error: insertError.message };

  await supabase.from("activity_log").insert({
    ticket_id: ticket.id,
    user_id: profile.id,
    action: "ticket_created",
    meta: { title },
  });

  if (labelIds.length > 0) {
    await supabase
      .from("ticket_label_map")
      .insert(labelIds.map((label_id) => ({ ticket_id: ticket.id, label_id })));
  }

  if (assignee_id) {
    void dispatchNotification({
      type: "CREATED",
      ticket: {
        id: ticket.id,
        ticket_number: ticket.ticket_number,
        title,
        assignee_id,
        created_by: profile.id,
        project_id: project.id,
      },
      actor: actorFromProfile(profile),
      meta: { projectSlug: slug },
    });
  }

  revalidateProject(slug, ticket.ticket_number);
  redirect(`/projects/${slug}/tickets/${ticket.ticket_number}`);
}

export async function updateTicket(
  slug: string,
  ticketNumber: number,
  formData: FormData
): Promise<ActionResult> {
  await requireAuth();
  const profile = await getProfile();
  if (!profile) return { error: "Not authenticated" };

  const { error, supabase, project } = await getProjectForAction(slug);
  if (error || !project) return { error: error ?? "Project not found" };

  const ticket = await getTicketByNumber(supabase, project.id, ticketNumber);
  if (!ticket) return { error: "Ticket not found" };

  const previousStatus = ticket.status;
  const previousAssigneeId = ticket.assignee_id;

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const type = formData.get("type") as TicketType;
  const status = formData.get("status") as TicketStatus;
  const priority = formData.get("priority") as TicketPriority;
  const assigneeRaw = formData.get("assignee_id");
  const assignee_id =
    assigneeRaw && String(assigneeRaw) !== "none" ? String(assigneeRaw) : null;
  const labelIds = formData.getAll("label_ids").map(String);
  const start_date = parseOptionalDate(formData.get("start_date"));
  const due_date = parseOptionalDate(formData.get("due_date"));

  if (!title) return { error: "Title is required" };
  if (start_date && due_date && start_date > due_date) {
    return { error: "Start date must be on or before due date" };
  }

  const { error: updateError } = await supabase
    .from("tickets")
    .update({
      title,
      description,
      type,
      status,
      priority,
      assignee_id,
      start_date,
      due_date,
    })
    .eq("id", ticket.id);

  if (updateError) return { error: updateError.message };

  const { data: existingMaps } = await supabase
    .from("ticket_label_map")
    .select("label_id")
    .eq("ticket_id", ticket.id);

  const existing = new Set((existingMaps ?? []).map((m) => m.label_id));
  const next = new Set(labelIds);

  const toAdd = labelIds.filter((id) => !existing.has(id));
  const toRemove = [...existing].filter((id) => !next.has(id));

  if (toAdd.length > 0) {
    await supabase
      .from("ticket_label_map")
      .insert(toAdd.map((label_id) => ({ ticket_id: ticket.id, label_id })));
  }

  for (const label_id of toRemove) {
    await supabase
      .from("ticket_label_map")
      .delete()
      .eq("ticket_id", ticket.id)
      .eq("label_id", label_id);
  }

  const actor = actorFromProfile(profile);
  const ticketPayload = {
    id: ticket.id,
    ticket_number: ticket.ticket_number,
    title,
    assignee_id,
    created_by: ticket.created_by,
    project_id: project.id,
  };
  const meta = { projectSlug: slug };

  if (previousAssigneeId !== assignee_id && assignee_id) {
    void dispatchNotification({
      type: "REASSIGNED",
      ticket: ticketPayload,
      actor,
      meta: {
        ...meta,
        previousAssigneeId,
        newAssigneeId: assignee_id,
      },
    });
  }

  if (previousStatus !== status) {
    void dispatchNotification({
      type: "STATUS_CHANGED",
      ticket: ticketPayload,
      actor,
      meta: {
        ...meta,
        previousStatus,
        newStatus: status,
      },
    });
  }

  revalidateProject(slug, ticketNumber);
  redirect(`/projects/${slug}/tickets/${ticketNumber}`);
}

export async function changeStatus(
  slug: string,
  ticketNumber: number,
  status: TicketStatus
): Promise<ActionResult> {
  await requireAuth();
  const profile = await getProfile();
  if (!profile) return { error: "Not authenticated" };

  const { error, supabase, project } = await getProjectForAction(slug);
  if (error || !project) return { error: error ?? "Project not found" };

  const ticket = await getTicketByNumber(supabase, project.id, ticketNumber);
  if (!ticket) return { error: "Ticket not found" };

  const previousStatus = ticket.status;

  const { error: updateError } = await supabase
    .from("tickets")
    .update({ status })
    .eq("id", ticket.id);

  if (updateError) return { error: updateError.message };

  if (previousStatus !== status) {
    void dispatchNotification({
      type: "STATUS_CHANGED",
      ticket: {
        id: ticket.id,
        ticket_number: ticket.ticket_number,
        title: ticket.title,
        assignee_id: ticket.assignee_id,
        created_by: ticket.created_by,
        project_id: project.id,
      },
      actor: actorFromProfile(profile),
      meta: { projectSlug: slug, previousStatus, newStatus: status },
    });
  }

  revalidateProject(slug, ticketNumber);
  return { success: true };
}

export async function addComment(
  slug: string,
  ticketNumber: number,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireAuth();
  const profile = await getProfile();

  const { error, supabase, project } = await getProjectForAction(slug);
  if (error || !project) return { error: error ?? "Project not found" };

  const ticket = await getTicketByNumber(supabase, project.id, ticketNumber);
  if (!ticket) return { error: "Ticket not found" };

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Comment cannot be empty" };

  const { error: insertError } = await supabase.from("comments").insert({
    ticket_id: ticket.id,
    user_id: user.id,
    body,
  });

  if (insertError) return { error: insertError.message };

  await supabase.from("activity_log").insert({
    ticket_id: ticket.id,
    user_id: profile?.id ?? user.id,
    action: "comment_added",
    meta: {},
  });

  const fullTicket = await getTicketByNumber(
    supabase,
    project.id,
    ticketNumber
  );
  if (fullTicket && profile) {
    void dispatchNotification({
      type: "COMMENT_ADDED",
      ticket: {
        id: fullTicket.id,
        ticket_number: fullTicket.ticket_number,
        title: fullTicket.title,
        assignee_id: fullTicket.assignee_id,
        created_by: fullTicket.created_by,
        project_id: project.id,
      },
      actor: actorFromProfile(profile),
      meta: { projectSlug: slug, commentPreview: body },
    });
  }

  revalidateProject(slug, ticketNumber);
  return { success: true };
}

export async function updateTicketLabels(
  slug: string,
  ticketNumber: number,
  labelIds: string[]
): Promise<ActionResult> {
  await requireAuth();

  const { error, supabase, project } = await getProjectForAction(slug);
  if (error || !project) return { error: error ?? "Project not found" };

  const ticket = await getTicketByNumber(supabase, project.id, ticketNumber);
  if (!ticket) return { error: "Ticket not found" };

  const { data: existingMaps } = await supabase
    .from("ticket_label_map")
    .select("label_id")
    .eq("ticket_id", ticket.id);

  const existing = new Set((existingMaps ?? []).map((m) => m.label_id));
  const next = new Set(labelIds);

  const toAdd = labelIds.filter((id) => !existing.has(id));
  const toRemove = [...existing].filter((id) => !next.has(id));

  if (toAdd.length > 0) {
    await supabase
      .from("ticket_label_map")
      .insert(toAdd.map((label_id) => ({ ticket_id: ticket.id, label_id })));
  }

  for (const label_id of toRemove) {
    await supabase
      .from("ticket_label_map")
      .delete()
      .eq("ticket_id", ticket.id)
      .eq("label_id", label_id);
  }

  revalidateProject(slug, ticketNumber);
  return { success: true };
}

export async function updateTicketTitle(
  slug: string,
  ticketNumber: number,
  title: string
): Promise<ActionResult> {
  await requireAuth();
  const trimmed = title.trim();
  if (!trimmed) return { error: "Title is required" };

  const { error, supabase, project } = await getProjectForAction(slug);
  if (error || !project) return { error: error ?? "Project not found" };

  const ticket = await getTicketByNumber(supabase, project.id, ticketNumber);
  if (!ticket) return { error: "Ticket not found" };

  const { error: updateError } = await supabase
    .from("tickets")
    .update({ title: trimmed })
    .eq("id", ticket.id);

  if (updateError) return { error: updateError.message };

  revalidateProject(slug, ticketNumber);
  return { success: true };
}

export async function updateTicketDescription(
  slug: string,
  ticketNumber: number,
  description: string
): Promise<ActionResult> {
  await requireAuth();

  const { error, supabase, project } = await getProjectForAction(slug);
  if (error || !project) return { error: error ?? "Project not found" };

  const ticket = await getTicketByNumber(supabase, project.id, ticketNumber);
  if (!ticket) return { error: "Ticket not found" };

  const value = description.trim() || null;

  const { error: updateError } = await supabase
    .from("tickets")
    .update({ description: value })
    .eq("id", ticket.id);

  if (updateError) return { error: updateError.message };

  revalidateProject(slug, ticketNumber);
  return { success: true };
}

export async function updateTicketPriority(
  slug: string,
  ticketNumber: number,
  priority: TicketPriority
): Promise<ActionResult> {
  await requireAuth();

  const { error, supabase, project } = await getProjectForAction(slug);
  if (error || !project) return { error: error ?? "Project not found" };

  const ticket = await getTicketByNumber(supabase, project.id, ticketNumber);
  if (!ticket) return { error: "Ticket not found" };

  const { error: updateError } = await supabase
    .from("tickets")
    .update({ priority })
    .eq("id", ticket.id);

  if (updateError) return { error: updateError.message };

  revalidateProject(slug, ticketNumber);
  return { success: true };
}

export async function updateTicketType(
  slug: string,
  ticketNumber: number,
  type: TicketType
): Promise<ActionResult> {
  await requireAuth();

  const { error, supabase, project } = await getProjectForAction(slug);
  if (error || !project) return { error: error ?? "Project not found" };

  const ticket = await getTicketByNumber(supabase, project.id, ticketNumber);
  if (!ticket) return { error: "Ticket not found" };

  const { error: updateError } = await supabase
    .from("tickets")
    .update({ type })
    .eq("id", ticket.id);

  if (updateError) return { error: updateError.message };

  revalidateProject(slug, ticketNumber);
  return { success: true };
}
