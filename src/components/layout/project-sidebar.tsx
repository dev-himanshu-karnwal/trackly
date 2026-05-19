"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ticket } from "lucide-react";

import { cn } from "@/lib/utils";

type ProjectSidebarProps = {
  projectSlug: string;
  projectName: string;
};

export function ProjectSidebar({
  projectSlug,
  projectName,
}: ProjectSidebarProps) {
  const pathname = usePathname();
  const ticketsHref = `/projects/${projectSlug}`;
  const isActive =
    pathname === ticketsHref || pathname.startsWith(`${ticketsHref}/tickets`);

  return (
    <aside className="border-sidebar-border bg-sidebar flex w-56 shrink-0 flex-col border-r">
      <div className="border-sidebar-border border-b px-4 py-4">
        <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          Project
        </p>
        <p className="text-sidebar-foreground mt-1 truncate font-semibold">
          {projectName}
        </p>
      </div>
      <nav className="flex flex-col gap-1 p-3">
        <Link
          href={ticketsHref}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
            isActive
              ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          <Ticket className="size-4" />
          Tickets
        </Link>
      </nav>
    </aside>
  );
}
