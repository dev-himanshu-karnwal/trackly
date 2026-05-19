import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Project, Profile, UserRole } from "@/types/database";

type Supabase = SupabaseClient<Database>;

export type ProjectSummary = {
  id: string;
  name: string;
  slug: string;
};

export async function getUserProjects(
  supabase: Supabase,
  userId: string,
  role: UserRole | undefined
): Promise<ProjectSummary[]> {
  if (role === "admin") {
    const { data } = await supabase
      .from("projects")
      .select("id, name, slug")
      .eq("is_archived", false)
      .order("name");
    return (data ?? []) as ProjectSummary[];
  }

  const { data } = await supabase
    .from("project_members")
    .select("projects!inner(id, name, slug, is_archived)")
    .eq("user_id", userId);

  type MemberRow = { projects: ProjectSummary & { is_archived: boolean } };
  return ((data as MemberRow[] | null) ?? [])
    .map((row) => row.projects)
    .filter((project) => project && !project.is_archived)
    .map(({ id, name, slug }) => ({ id, name, slug }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getProjectBySlug(
  supabase: Supabase,
  slug: string
): Promise<Project | null> {
  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  return data;
}

export async function getProjectMembers(
  supabase: Supabase,
  projectId: string
): Promise<Pick<Profile, "id" | "name" | "email" | "role">[]> {
  const { data } = await supabase
    .from("project_members")
    .select("profiles!inner(id, name, email, role, is_active)")
    .eq("project_id", projectId);

  type Row = {
    profiles: Pick<Profile, "id" | "name" | "email" | "role" | "is_active">;
  };

  return ((data as Row[] | null) ?? [])
    .map((r) => r.profiles)
    .filter((p) => p.is_active);
}

export async function getProjectAssignees(
  supabase: Supabase,
  projectId: string,
  isAdmin: boolean
): Promise<Pick<Profile, "id" | "name" | "email">[]> {
  if (isAdmin) {
    const { data } = await supabase
      .from("profiles")
      .select("id, name, email")
      .eq("is_active", true)
      .order("name");
    return data ?? [];
  }
  return getProjectMembers(supabase, projectId);
}
