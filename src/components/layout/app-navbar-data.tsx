import { cookies } from "next/headers";

import { AppNavbar } from "@/components/layout/app-navbar";
import { getProfile } from "@/lib/auth";
import { getUserProjects } from "@/lib/projects";
import { createClient } from "@/utils/supabase/server";

type AppNavbarDataProps = {
  currentProjectSlug?: string;
};

export async function AppNavbarData({
  currentProjectSlug,
}: AppNavbarDataProps = {}) {
  const profile = await getProfile();
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const projects =
    profile != null
      ? await getUserProjects(supabase, profile.id, profile.role)
      : [];

  return (
    <AppNavbar
      profile={profile}
      projects={projects}
      currentProjectSlug={currentProjectSlug}
    />
  );
}
