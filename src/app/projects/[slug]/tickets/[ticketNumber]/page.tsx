import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { cookies } from "next/headers";
import { Pencil } from "lucide-react";

import {
  addComment,
  changeStatus,
  updateTicketDescription,
  updateTicketLabels,
  updateTicketPriority,
  updateTicketTitle,
  updateTicketType,
} from "@/app/projects/[slug]/actions";
import {
  PriorityBadge,
  StatusBadge,
  TypeBadge,
} from "@/components/tickets/ticket-badges";
import { TicketInlineDescription } from "@/components/tickets/ticket-inline-description";
import { TicketInlineSelect } from "@/components/tickets/ticket-inline-select";
import { TicketInlineTitle } from "@/components/tickets/ticket-inline-title";
import {
  TicketActivity,
  type ActivityWithUser,
} from "@/components/tickets/ticket-activity";
import {
  TicketComments,
  type CommentWithAuthor,
} from "@/components/tickets/ticket-comments";
import { TicketLabelsManager } from "@/components/tickets/ticket-labels-manager";
import { TicketStatusSelect } from "@/components/tickets/ticket-status-select";
import { Button } from "@/components/ui/button";
import { PRIORITY_LABELS, TYPE_LABELS } from "@/lib/constants";
import {
  formatTicketDate,
  formatTicketId,
  parseTicketNumber,
} from "@/lib/tickets";
import { getProjectBySlug } from "@/lib/projects";
import type { ActivityLog, Ticket, TicketLabel } from "@/types/database";
import { createClient } from "@/utils/supabase/server";

type TicketWithRelations = Ticket & {
  assignee: { id: string; name: string; email: string } | null;
  creator: { id: string; name: string } | null;
};

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ slug: string; ticketNumber: string }>;
}) {
  const { slug, ticketNumber: ticketNumberParam } = await params;
  const ticketNumber = parseTicketNumber(ticketNumberParam);
  if (!ticketNumber) notFound();

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const project = await getProjectBySlug(supabase, slug);
  if (!project) notFound();

  const { data: ticket } = await supabase
    .from("tickets")
    .select("*")
    .eq("project_id", project.id)
    .eq("ticket_number", ticketNumber)
    .maybeSingle();

  if (!ticket) notFound();

  const [
    assigneeResult,
    creatorResult,
    labelMapsResult,
    labelsResult,
    commentsResult,
    activityResult,
  ] = await Promise.all([
    ticket.assignee_id
      ? supabase
          .from("profiles")
          .select("id, name, email")
          .eq("id", ticket.assignee_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("profiles")
      .select("id, name")
      .eq("id", ticket.created_by)
      .maybeSingle(),
    supabase
      .from("ticket_label_map")
      .select("label_id")
      .eq("ticket_id", ticket.id),
    supabase
      .from("ticket_labels")
      .select("*")
      .eq("project_id", project.id)
      .order("name"),
    supabase
      .from("comments")
      .select("id, body, created_at, user_id")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("activity_log")
      .select("*")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: false }),
  ]);

  const row: TicketWithRelations = {
    ...ticket,
    assignee: assigneeResult.data,
    creator: creatorResult.data,
  };

  const selectedLabelIds = (labelMapsResult.data ?? []).map((m) => m.label_id);

  const commentRows = commentsResult.data ?? [];
  const commentUserIds = [...new Set(commentRows.map((c) => c.user_id))];
  const { data: commentAuthors } =
    commentUserIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, name")
          .in("id", commentUserIds)
      : { data: [] as { id: string; name: string }[] };

  const authorMap = new Map((commentAuthors ?? []).map((a) => [a.id, a]));

  const commentsWithAuthor: CommentWithAuthor[] = commentRows.map((c) => ({
    id: c.id,
    body: c.body,
    created_at: c.created_at,
    author: authorMap.get(c.user_id) ?? null,
  }));

  const activityRows = activityResult.data ?? [];
  const activityUserIds = [
    ...new Set(
      activityRows
        .map((a) => a.user_id)
        .filter((id): id is string => id != null)
    ),
  ];
  const { data: activityUsers } =
    activityUserIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, name")
          .in("id", activityUserIds)
      : { data: [] as { id: string; name: string }[] };

  const activityUserMap = new Map((activityUsers ?? []).map((u) => [u.id, u]));

  const activityItems: ActivityWithUser[] = activityRows.map(
    (a: ActivityLog) => ({
      ...a,
      user: a.user_id ? (activityUserMap.get(a.user_id) ?? null) : null,
    })
  );

  const displayId = formatTicketId(project.slug, row.ticket_number);

  const priorityOptions = Object.entries(PRIORITY_LABELS).map(
    ([value, label]) => ({
      value,
      label,
    })
  );
  const typeOptions = Object.entries(TYPE_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <header className="border-border/80 bg-card/50 space-y-4 rounded-xl border p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 font-mono text-xs">
                {displayId}
              </span>
              <StatusBadge status={row.status} />
              <TypeBadge type={row.type} />
              <PriorityBadge priority={row.priority} />
            </div>
            <TicketInlineTitle
              slug={slug}
              ticketNumber={ticketNumber}
              title={row.title}
              saveAction={updateTicketTitle}
            />
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/projects/${slug}/tickets/${ticketNumber}/edit`}>
              <Pencil className="mr-2 size-4" />
              Edit
            </Link>
          </Button>
        </div>

        <div className="text-muted-foreground flex flex-wrap items-center gap-4 text-sm">
          <span>
            Assignee:{" "}
            <span className="text-foreground">
              {row.assignee?.name ?? "Unassigned"}
            </span>
          </span>
          <span>Reporter: {row.creator?.name ?? "—"}</span>
          <span>Start {formatTicketDate(row.start_date)}</span>
          <span>Due {formatTicketDate(row.due_date)}</span>
          <span>Created {format(new Date(row.created_at), "MMM d, yyyy")}</span>
          <span>Updated {format(new Date(row.updated_at), "MMM d, yyyy")}</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Status</span>
          <TicketStatusSelect
            slug={slug}
            ticketNumber={ticketNumber}
            status={row.status}
            changeStatus={changeStatus}
          />
        </div>
      </header>

      <TicketInlineDescription
        slug={slug}
        ticketNumber={ticketNumber}
        projectId={project.id}
        ticketId={ticket.id}
        description={row.description ?? ""}
        saveAction={updateTicketDescription}
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_240px]">
        <div className="space-y-8">
          <TicketComments
            slug={slug}
            ticketNumber={ticketNumber}
            comments={commentsWithAuthor}
            addComment={addComment}
          />
          <TicketActivity activities={activityItems} />
        </div>

        <aside className="space-y-6">
          <TicketLabelsManager
            slug={slug}
            ticketNumber={ticketNumber}
            allLabels={(labelsResult.data as TicketLabel[]) ?? []}
            selectedLabelIds={selectedLabelIds}
            updateTicketLabels={updateTicketLabels}
          />
          <div className="border-border/80 bg-card rounded-xl border p-4 text-sm shadow-sm">
            <dl className="space-y-4">
              <div>
                <dt className="text-muted-foreground mb-1.5 text-xs font-medium tracking-wide uppercase">
                  Type
                </dt>
                <dd>
                  <TicketInlineSelect
                    slug={slug}
                    ticketNumber={ticketNumber}
                    value={row.type}
                    options={typeOptions}
                    saveAction={
                      updateTicketType as (
                        slug: string,
                        ticketNumber: number,
                        value: string
                      ) => ReturnType<typeof updateTicketType>
                    }
                  />
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground mb-1.5 text-xs font-medium tracking-wide uppercase">
                  Priority
                </dt>
                <dd>
                  <TicketInlineSelect
                    slug={slug}
                    ticketNumber={ticketNumber}
                    value={row.priority}
                    options={priorityOptions}
                    saveAction={
                      updateTicketPriority as (
                        slug: string,
                        ticketNumber: number,
                        value: string
                      ) => ReturnType<typeof updateTicketPriority>
                    }
                  />
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Start date</dt>
                <dd className="mt-0.5">{formatTicketDate(row.start_date)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Due date</dt>
                <dd className="mt-0.5">{formatTicketDate(row.due_date)}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
