import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";

import { AppNavbarData } from "@/components/layout/app-navbar-data";
import { ProjectSidebar } from "@/components/layout/project-sidebar";
import { ProjectProvider } from "@/contexts/project-context";
import { getProfile, requireAuth } from "@/lib/auth";
import { canCreateTickets } from "@/lib/tickets";
import { getProjectBySlug, getProjectMembers } from "@/lib/projects";
import { createClient } from "@/utils/supabase/server";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  await requireAuth();
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const { slug } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const project = await getProjectBySlug(supabase, slug);
  if (!project || project.is_archived) notFound();

  if (profile.role !== "admin") {
    const { data: membership } = await supabase
      .from("project_members")
      .select("project_id")
      .eq("project_id", project.id)
      .eq("user_id", profile.id)
      .maybeSingle();

    if (!membership) notFound();
  }

  const members = await getProjectMembers(supabase, project.id);

  return (
    <ProjectProvider
      value={{
        project,
        profile,
        canCreateTickets: canCreateTickets(profile.role),
        members,
      }}
    >
      <div className="flex min-h-screen flex-col">
        <AppNavbarData currentProjectSlug={slug} />
        <div className="flex flex-1">
          <ProjectSidebar projectSlug={slug} projectName={project.name} />
          <main className="min-w-0 flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </ProjectProvider>
  );
}
