import { AppNavbarData } from "@/components/layout/app-navbar-data";
import { PushPrompt } from "@/components/notifications/push-prompt";
import { getProfile, requireAuth } from "@/lib/auth";

export async function AppShell({ children }: { children: React.ReactNode }) {
  await requireAuth();
  const profile = await getProfile();

  return (
    <>
      <AppNavbarData />
      <PushPrompt pushEnabled={profile?.push_enabled ?? true} />
      {children}
    </>
  );
}
