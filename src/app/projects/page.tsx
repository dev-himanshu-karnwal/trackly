import Link from "next/link";
import { cookies } from "next/headers";
import { FolderKanban } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { getProfile, requireAuth } from "@/lib/auth";
import { getUserProjects } from "@/lib/projects";
import { createClient } from "@/utils/supabase/server";

function projectInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default async function ProjectsPage() {
  const user = await requireAuth();
  const profile = await getProfile();
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const projects = await getUserProjects(supabase, user.id, profile?.role);

  return (
    <AppShell>
      <main className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight">Your projects</h1>
          <p className="text-muted-foreground mt-2">
            {profile?.role === "admin"
              ? "All active projects in your workspace"
              : "Projects you are a member of"}
          </p>
        </div>

        {projects.length === 0 ? (
          <div className="border-primary/30 bg-card/50 flex flex-col items-center rounded-2xl border border-dashed px-6 py-16 text-center">
            <FolderKanban className="text-primary/40 mb-4 size-12" />
            <p className="text-foreground font-medium">No projects yet</p>
            <p className="text-muted-foreground mt-1 max-w-sm text-sm">
              Ask an admin to add you to a project, or create one from the admin
              panel.
            </p>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {projects.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/projects/${project.slug}`}
                  className="group border-border/80 bg-card hover:border-primary/30 hover:shadow-primary/5 flex gap-4 rounded-xl border p-5 shadow-sm transition-all hover:shadow-md"
                >
                  <span className="bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground flex size-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold transition-colors">
                    {projectInitials(project.name)}
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-foreground group-hover:text-primary truncate font-semibold">
                      {project.name}
                    </h2>
                    <p className="text-muted-foreground mt-0.5 font-mono text-xs">
                      /{project.slug}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </AppShell>
  );
}
