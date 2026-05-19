import { redirect } from "next/navigation";

import { SettingsForm } from "@/app/settings/settings-form";
import { AppShell } from "@/components/layout/app-shell";
import { getProfile, requireAuth } from "@/lib/auth";

export default async function SettingsPage() {
  await requireAuth();
  const profile = await getProfile();

  if (!profile) {
    redirect("/login");
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage your password and notification preferences
          </p>
        </div>
        <SettingsForm profile={profile} />
      </main>
    </AppShell>
  );
}
