import Link from "next/link";
import { Pencil, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export default async function AdminProjectsPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, slug, description, is_archived")
    .order("name");

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {projects?.length ?? 0} project
          {(projects?.length ?? 0) === 1 ? "" : "s"}
        </p>
        <Button asChild size="sm">
          <Link href="/admin/projects/new">
            <Plus className="size-4" />
            New project
          </Link>
        </Button>
      </div>

      {!projects || projects.length === 0 ? (
        <p className="border-border text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center text-sm">
          No projects yet.
        </p>
      ) : (
        <div className="border-border rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    /{project.slug}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">
                    {project.description ?? "—"}
                  </TableCell>
                  <TableCell>
                    {project.is_archived ? (
                      <Badge variant="outline">Archived</Badge>
                    ) : (
                      <Badge variant="secondary">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon-sm" asChild>
                      <Link href={`/admin/projects/${project.id}/edit`}>
                        <Pencil className="size-4" />
                        <span className="sr-only">Edit {project.name}</span>
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
