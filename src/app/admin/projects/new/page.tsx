import { ProjectCreateForm } from "@/components/admin/project-create-form";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export default async function AdminNewProjectPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: users } = await supabase
    .from("profiles")
    .select("id, name, email, role, is_active")
    .eq("is_active", true)
    .order("name");

  return (
    <div>
      <h2 className="mb-6 text-lg font-medium">Create project</h2>
      <ProjectCreateForm users={users ?? []} />
    </div>
  );
}
