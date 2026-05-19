import { AppNavbarServer } from "@/components/layout/app-navbar-server";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="bg-background min-h-screen">
      <AppNavbarServer />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage users and projects
          </p>
        </div>
        <AdminNav />
        {children}
      </div>
    </div>
  );
}
