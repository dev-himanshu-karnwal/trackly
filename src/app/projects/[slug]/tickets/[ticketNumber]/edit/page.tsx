import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";

import { updateTicket } from "@/app/projects/[slug]/actions";
import { TicketForm } from "@/components/tickets/ticket-form";
import { parseTicketNumber } from "@/lib/tickets";
import { getProjectAssignees, getProjectBySlug } from "@/lib/projects";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";

export default async function EditTicketPage({
  params,
}: {
  params: Promise<{ slug: string; ticketNumber: string }>;
}) {
  const { slug, ticketNumber: ticketNumberParam } = await params;
  const ticketNumber = parseTicketNumber(ticketNumberParam);
  if (!ticketNumber) notFound();

  const profile = await getProfile();
  if (!profile) redirect("/login");

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

  const [{ data: labelMaps }, assignees, { data: labels }] = await Promise.all([
    supabase
      .from("ticket_label_map")
      .select("label_id")
      .eq("ticket_id", ticket.id),
    getProjectAssignees(supabase, project.id, profile.role === "admin"),
    supabase
      .from("ticket_labels")
      .select("*")
      .eq("project_id", project.id)
      .order("name"),
  ]);

  const selectedLabelIds = (labelMaps ?? []).map((m) => m.label_id);

  return (
    <div className="p-6">
      <TicketForm
        slug={slug}
        projectId={project.id}
        assignees={assignees}
        labels={labels ?? []}
        mode="edit"
        ticket={ticket}
        selectedLabelIds={selectedLabelIds}
        action={updateTicket.bind(null, slug, ticketNumber)}
      />
    </div>
  );
}
