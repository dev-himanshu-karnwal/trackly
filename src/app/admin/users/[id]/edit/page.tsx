import { notFound } from "next/navigation";

import { UserEditForm } from "@/components/admin/user-edit-form";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminEditUserPage({ params }: PageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: user } = await supabase
    .from("profiles")
    .select("id, name, email, role, is_active")
    .eq("id", id)
    .maybeSingle();

  if (!user) {
    notFound();
  }

  return (
    <div>
      <h2 className="mb-6 text-lg font-medium">Edit user</h2>
      <UserEditForm user={user} />
    </div>
  );
}
