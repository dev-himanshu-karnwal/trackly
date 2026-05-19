import { notFound } from "next/navigation";

import { ProjectEditForm } from "@/components/admin/project-edit-form";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminEditProjectPage({ params }: PageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const [{ data: project }, { data: members }, { data: users }] =
    await Promise.all([
      supabase
        .from("projects")
        .select("id, name, slug, description, is_archived")
        .eq("id", id)
        .maybeSingle(),
      supabase.from("project_members").select("user_id").eq("project_id", id),
      supabase
        .from("profiles")
        .select("id, name, email, role, is_active")
        .eq("is_active", true)
        .order("name"),
    ]);

  if (!project) {
    notFound();
  }

  const memberIds = (members ?? []).map((m) => m.user_id);

  return (
    <div>
      <h2 className="mb-6 text-lg font-medium">Edit project</h2>
      <ProjectEditForm
        project={project}
        memberIds={memberIds}
        users={users ?? []}
      />
    </div>
  );
}
