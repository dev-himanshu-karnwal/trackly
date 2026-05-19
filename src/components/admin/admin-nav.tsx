"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const tabs = [
  {
    href: "/admin/users",
    label: "Users",
    match: (path: string) => path.startsWith("/admin/users"),
  },
  {
    href: "/admin/projects",
    label: "Projects",
    match: (path: string) => path.startsWith("/admin/projects"),
  },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="border-border mb-8 flex gap-1 border-b">
      {tabs.map((tab) => {
        const active = tab.match(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground border-transparent"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
