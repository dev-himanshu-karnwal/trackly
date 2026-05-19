"use client";

import { usePathname, useRouter } from "next/navigation";
import { Check, ChevronDown, FolderKanban, LayoutGrid } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { ProjectSummary } from "@/lib/projects";
import { cn } from "@/lib/utils";

type ProjectSwitcherProps = {
  projects: ProjectSummary[];
  currentProjectSlug?: string | null;
};

export function ProjectSwitcher({
  projects,
  currentProjectSlug,
}: ProjectSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();

  const current =
    projects.find((p) => p.slug === currentProjectSlug) ??
    (currentProjectSlug
      ? { slug: currentProjectSlug, name: currentProjectSlug, id: "" }
      : null);

  const label = current?.name ?? "Select project";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-primary/20 bg-primary/5 text-foreground hover:bg-primary/10 ml-1 max-w-[220px] gap-2 font-medium shadow-sm"
          aria-label="Switch project"
        >
          <LayoutGrid className="text-primary size-4 shrink-0" />
          <span className="truncate">{label}</span>
          <ChevronDown className="size-3.5 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search projects…" />
          <CommandList>
            <CommandEmpty>No projects found.</CommandEmpty>
            <CommandGroup heading="Projects">
              {projects.map((project) => {
                const isActive = project.slug === currentProjectSlug;
                return (
                  <CommandItem
                    key={project.id}
                    value={`${project.name} ${project.slug}`}
                    onSelect={() => {
                      if (project.slug === currentProjectSlug) return;
                      router.push(`/projects/${project.slug}`);
                    }}
                    className="gap-2"
                  >
                    <FolderKanban className="text-muted-foreground size-4" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{project.name}</p>
                      <p className="text-muted-foreground truncate text-xs">
                        /{project.slug}
                      </p>
                    </div>
                    <Check
                      className={cn(
                        "text-primary size-4 shrink-0",
                        isActive ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                value="all projects"
                onSelect={() => router.push("/projects")}
                className={cn("gap-2", pathname === "/projects" && "bg-accent")}
              >
                <LayoutGrid className="size-4" />
                All projects
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
