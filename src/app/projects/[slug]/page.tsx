import { Suspense } from "react";
import { cookies } from "next/headers";

import {
  TicketList,
  type TicketListItem,
} from "@/components/tickets/ticket-list";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/utils/supabase/server";
import type { TicketLabel } from "@/types/database";

export default async function ProjectTicketsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: project } = await supabase
    .from("projects")
    .select("id, slug")
    .eq("slug", slug)
    .single();

  if (!project) return null;

  const { data: profile } = await supabase.auth.getUser();

  const { data: rawTickets } = await supabase
    .from("tickets")
    .select(
      `
      id,
      ticket_number,
      title,
      type,
      status,
      priority,
      updated_at,
      created_at,
      start_date,
      due_date,
      assignee_id,
      ticket_label_map(
        label:ticket_labels(id, name, color)
      )
    `
    )
    .eq("project_id", project.id)
    .order("updated_at", { ascending: false });

  const { data: labels } = await supabase
    .from("ticket_labels")
    .select("*")
    .eq("project_id", project.id)
    .order("name");

  const { data: members } = await supabase
    .from("project_members")
    .select("profiles!inner(id, name, is_active)")
    .eq("project_id", project.id);

  type MemberRow = {
    profiles: { id: string; name: string; is_active: boolean };
  };
  type LabelMapRow = {
    label: Pick<TicketLabel, "id" | "name" | "color"> | null;
  };
  type RawTicket = {
    id: string;
    ticket_number: number;
    title: string;
    type: TicketListItem["type"];
    status: TicketListItem["status"];
    priority: TicketListItem["priority"];
    updated_at: string;
    created_at: string;
    start_date: string | null;
    due_date: string | null;
    assignee_id: string | null;
    ticket_label_map: LabelMapRow[];
  };

  const rawList = (rawTickets as RawTicket[] | null) ?? [];
  const assigneeIds = [
    ...new Set(
      rawList.map((t) => t.assignee_id).filter((id): id is string => id != null)
    ),
  ];
  const { data: assigneeProfiles } =
    assigneeIds.length > 0
      ? await supabase.from("profiles").select("id, name").in("id", assigneeIds)
      : { data: [] as { id: string; name: string }[] };

  const assigneeMap = new Map((assigneeProfiles ?? []).map((a) => [a.id, a]));

  const tickets: TicketListItem[] = rawList.map((t) => ({
    id: t.id,
    ticket_number: t.ticket_number,
    title: t.title,
    type: t.type,
    status: t.status,
    priority: t.priority,
    updated_at: t.updated_at,
    created_at: t.created_at,
    start_date: t.start_date,
    due_date: t.due_date,
    assignee: t.assignee_id ? (assigneeMap.get(t.assignee_id) ?? null) : null,
    labels: (t.ticket_label_map ?? [])
      .map((m) => m.label)
      .filter(
        (l): l is Pick<TicketLabel, "id" | "name" | "color"> => l != null
      ),
  }));

  const memberList = ((members as MemberRow[] | null) ?? [])
    .map((m) => m.profiles)
    .filter((p) => p.is_active);

  const { data: userProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", profile.user?.id ?? "")
    .maybeSingle();

  const canCreate = userProfile?.role === "admin" || userProfile?.role === "qa";

  return (
    <Suspense fallback={<TicketListSkeleton />}>
      <TicketList
        slug={slug}
        projectSlug={project.slug}
        tickets={tickets}
        members={memberList}
        labels={(labels as TicketLabel[]) ?? []}
        canCreateTickets={canCreate}
      />
    </Suspense>
  );
}

function TicketListSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
