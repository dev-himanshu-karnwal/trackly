/**
 * Trackly notification dispatcher (PRD §5.8, §9)
 *
 * Call `dispatchNotification` from ticket server actions after successful DB writes:
 *
 * | Action                         | Event type       | When / notes                          |
 * |--------------------------------|------------------|---------------------------------------|
 * | createTicket (with assignee)   | CREATED          | After insert if assignee_id is set    |
 * | updateTicket assignee          | REASSIGNED       | meta.newAssigneeId = new assignee     |
 * | updateTicket status            | STATUS_CHANGED   | meta.previousStatus, meta.newStatus   |
 * | addComment                     | COMMENT_ADDED    | meta.commentPreview, optional ids     |
 * | admin creates user / invite    | USER_WELCOME     | On first profile / auth signup        |
 *
 * Recipients (actor excluded):
 * - CREATED → assignee
 * - REASSIGNED → new assignee
 * - STATUS_CHANGED → assignee + creator
 * - COMMENT_ADDED → assignee + creator + prior commenters
 */

import { sendEmail } from "@/lib/email";
import {
  buildEmail,
  type EmailTemplateType,
} from "@/lib/notifications/email-templates";
import { sendPushToUser, type PushPayload } from "@/lib/push";
import { createAdminClient } from "@/utils/supabase/admin";
import type { TicketStatus } from "@/types/database";

export type TicketNotificationType =
  | "CREATED"
  | "REASSIGNED"
  | "STATUS_CHANGED"
  | "COMMENT_ADDED";

export type NotificationEventType = TicketNotificationType | "USER_WELCOME";

export interface NotificationActor {
  id: string;
  name: string;
  email: string;
}

export interface NotificationTicket {
  id: string;
  ticket_number: number;
  title: string;
  assignee_id: string | null;
  created_by: string;
  project_id: string;
}

export interface TicketNotificationMeta {
  projectSlug: string;
  projectName?: string;
  previousStatus?: TicketStatus;
  newStatus?: TicketStatus;
  previousAssigneeId?: string | null;
  newAssigneeId?: string | null;
  commentPreview?: string;
  /** Pre-fetched commenter user ids; fetched from DB if omitted */
  priorCommenterIds?: string[];
}

export interface TicketNotificationEvent {
  type: TicketNotificationType;
  ticket: NotificationTicket;
  actor: NotificationActor;
  meta: TicketNotificationMeta;
}

export interface WelcomeNotificationEvent {
  type: "USER_WELCOME";
  user: { id: string; name: string; email: string };
}

export type NotificationEvent =
  | TicketNotificationEvent
  | WelcomeNotificationEvent;

interface RecipientProfile {
  id: string;
  name: string;
  email: string;
  push_enabled: boolean;
}

function ticketUrl(projectSlug: string, ticketNumber: number): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://trackly.dctinfotech.com";
  return `${base.replace(/\/$/, "")}/projects/${projectSlug}/tickets/${ticketNumber}`;
}

function templateForType(type: TicketNotificationType): EmailTemplateType {
  switch (type) {
    case "CREATED":
      return "assigned";
    case "REASSIGNED":
      return "reassigned";
    case "STATUS_CHANGED":
      return "status_changed";
    case "COMMENT_ADDED":
      return "comment_added";
  }
}

function pushTitleForType(type: TicketNotificationType): string {
  switch (type) {
    case "CREATED":
      return "Ticket assigned to you";
    case "REASSIGNED":
      return "Ticket reassigned to you";
    case "STATUS_CHANGED":
      return "Ticket status updated";
    case "COMMENT_ADDED":
      return "New comment on ticket";
  }
}

async function fetchPriorCommenters(ticketId: string): Promise<string[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("comments")
      .select("*")
      .eq("ticket_id", ticketId);
    const ids = new Set((data ?? []).map((row) => row.user_id));
    return [...ids];
  } catch {
    return [];
  }
}

async function resolveRecipientIds(
  type: TicketNotificationType,
  ticket: NotificationTicket,
  meta: TicketNotificationMeta
): Promise<string[]> {
  const ids = new Set<string>();

  switch (type) {
    case "CREATED":
      if (ticket.assignee_id) ids.add(ticket.assignee_id);
      break;
    case "REASSIGNED": {
      const newAssignee = meta.newAssigneeId ?? ticket.assignee_id;
      if (newAssignee) ids.add(newAssignee);
      break;
    }
    case "STATUS_CHANGED":
      if (ticket.assignee_id) ids.add(ticket.assignee_id);
      ids.add(ticket.created_by);
      break;
    case "COMMENT_ADDED":
      if (ticket.assignee_id) ids.add(ticket.assignee_id);
      ids.add(ticket.created_by);
      for (const id of meta.priorCommenterIds ??
        (await fetchPriorCommenters(ticket.id))) {
        ids.add(id);
      }
      break;
  }

  return [...ids];
}

async function loadRecipients(
  userIds: string[],
  actorId: string
): Promise<RecipientProfile[]> {
  const filtered = userIds.filter((id) => id && id !== actorId);
  if (!filtered.length) return [];

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("profiles")
      .select("*")
      .in("id", filtered);

    return (data ?? [])
      .filter((p) => p.is_active && Boolean(p.email))
      .map(({ id, name, email, push_enabled }) => ({
        id,
        name,
        email,
        push_enabled,
      }));
  } catch (err) {
    console.error("[notify] Failed to load recipients:", err);
    return [];
  }
}

async function resolveProjectName(
  projectId: string,
  meta: TicketNotificationMeta
): Promise<string> {
  if (meta.projectName) return meta.projectName;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .maybeSingle();
    return data?.name ?? meta.projectSlug;
  } catch {
    return meta.projectSlug;
  }
}

export async function notifyTicketEvent({
  type,
  ticket,
  actor,
  meta,
}: TicketNotificationEvent): Promise<void> {
  const recipientIds = await resolveRecipientIds(type, ticket, meta);
  const recipients = await loadRecipients(recipientIds, actor.id);
  if (!recipients.length) return;

  const projectName = await resolveProjectName(ticket.project_id, meta);
  const url = ticketUrl(meta.projectSlug, ticket.ticket_number);
  const templateType = templateForType(type);

  await Promise.all(
    recipients.map(async (recipient) => {
      const { subject, html, text } = buildEmail(templateType, {
        recipientName: recipient.name,
        actorName: actor.name,
        ticketTitle: ticket.title,
        ticketNumber: ticket.ticket_number,
        projectName,
        ticketUrl: url,
        previousStatus: meta.previousStatus,
        newStatus: meta.newStatus,
        commentPreview: meta.commentPreview,
      });

      await sendEmail({ to: recipient.email, subject, html, text });
    })
  );
}

async function sendPushForTicketEvent(
  event: TicketNotificationEvent
): Promise<void> {
  const recipientIds = await resolveRecipientIds(
    event.type,
    event.ticket,
    event.meta
  );
  const recipients = await loadRecipients(recipientIds, event.actor.id);
  if (!recipients.length) return;

  const url = ticketUrl(event.meta.projectSlug, event.ticket.ticket_number);
  const title = pushTitleForType(event.type);
  const body = `#${event.ticket.ticket_number}: ${event.ticket.title}`;

  const payload: PushPayload = {
    title,
    body,
    url,
    tag: `ticket-${event.ticket.id}`,
  };

  await Promise.all(
    recipients
      .filter((r) => r.push_enabled)
      .map((r) => sendPushToUser(r.id, payload))
  );
}

async function notifyWelcome(event: WelcomeNotificationEvent): Promise<void> {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://trackly.dctinfotech.com";
  const { subject, html, text } = buildEmail("user_welcome", {
    recipientName: event.user.name,
    actorName: "Trackly",
    ticketTitle: "",
    ticketNumber: 0,
    projectName: "",
    ticketUrl: appUrl,
    appUrl,
  });

  await sendEmail({
    to: event.user.email,
    subject,
    html,
    text,
  });
}

/** Entry point for server actions — sends email and web push where configured. */
export async function dispatchNotification(
  event: NotificationEvent
): Promise<void> {
  try {
    if (event.type === "USER_WELCOME") {
      await notifyWelcome(event);
      return;
    }

    await Promise.all([
      notifyTicketEvent(event),
      sendPushForTicketEvent(event),
    ]);
  } catch (err) {
    console.error("[notify] dispatchNotification failed:", err);
  }
}
