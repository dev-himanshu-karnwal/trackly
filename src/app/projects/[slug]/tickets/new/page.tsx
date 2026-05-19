import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { createTicket } from "@/app/projects/[slug]/actions";
import { TicketForm } from "@/components/tickets/ticket-form";
import { getProfile } from "@/lib/auth";
import { canCreateTickets } from "@/lib/tickets";
import { getProjectAssignees, getProjectBySlug } from "@/lib/projects";
import { createClient } from "@/utils/supabase/server";

export default async function NewTicketPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = await getProfile();
  if (!profile || !canCreateTickets(profile.role)) {
    redirect(`/projects/${slug}`);
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const project = await getProjectBySlug(supabase, slug);
  if (!project) redirect("/projects");

  const [assignees, { data: labels }] = await Promise.all([
    getProjectAssignees(supabase, project.id, profile.role === "admin"),
    supabase
      .from("ticket_labels")
      .select("*")
      .eq("project_id", project.id)
      .order("name"),
  ]);

  return (
    <div className="p-6">
      <TicketForm
        slug={slug}
        assignees={assignees}
        labels={labels ?? []}
        mode="create"
        action={createTicket.bind(null, slug)}
      />
    </div>
  );
}
