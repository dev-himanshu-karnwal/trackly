"use client";

import Link from "next/link";

import { NotificationsBell } from "@/components/layout/notifications-bell";
import { ProjectSwitcher } from "@/components/layout/project-switcher";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABELS } from "@/lib/constants";
import type { ProjectSummary } from "@/lib/projects";
import type { Profile } from "@/types/database";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

interface AppNavbarProps {
  profile?: Pick<Profile, "name" | "email" | "role"> | null;
  projects?: ProjectSummary[];
  currentProjectSlug?: string | null;
}

export function AppNavbar({
  profile,
  projects = [],
  currentProjectSlug,
}: AppNavbarProps) {
  const displayName = profile?.name ?? "User";
  const avatarLabel = initials(displayName);

  return (
    <header className="border-border/80 bg-background/90 supports-[backdrop-filter]:bg-background/75 sticky top-0 z-50 border-b shadow-sm backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center gap-3 px-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-lg font-bold tracking-tight"
        >
          <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg text-sm font-bold shadow-sm">
            T
          </span>
          <span className="from-primary to-primary/70 hidden bg-gradient-to-r bg-clip-text text-transparent sm:inline">
            Trackly
          </span>
        </Link>

        <nav className="hidden items-center gap-4 sm:flex">
          <Link
            href="/dashboard"
            className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/projects"
            className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
          >
            Projects
          </Link>
        </nav>

        {projects.length > 0 ? (
          <ProjectSwitcher
            projects={projects}
            currentProjectSlug={currentProjectSlug}
          />
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          {profile?.role === "admin" && (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-muted-foreground"
            >
              <Link href="/admin/users">Admin</Link>
            </Button>
          )}
          <NotificationsBell />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="ring-primary/10 rounded-full ring-2"
              >
                <Avatar className="size-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {avatarLabel}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-1">
                  <p className="leading-none font-medium">{displayName}</p>
                  <p className="text-muted-foreground text-xs">
                    {profile?.email}
                  </p>
                  {profile?.role ? (
                    <Badge
                      variant="secondary"
                      className="mt-1 w-fit text-[10px]"
                    >
                      {ROLE_LABELS[profile.role]}
                    </Badge>
                  ) : null}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <form
                  action="/api/auth/signout"
                  method="post"
                  className="w-full"
                >
                  <button type="submit" className="w-full text-left">
                    Sign out
                  </button>
                </form>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
