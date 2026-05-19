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
import { ROLE_LABELS } from "@/lib/constants";
import type { UserRole } from "@/types/database";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export default async function AdminUsersPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: users } = await supabase
    .from("profiles")
    .select("id, name, email, role, is_active")
    .order("name");

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {users?.length ?? 0} user{(users?.length ?? 0) === 1 ? "" : "s"}
        </p>
        <Button asChild size="sm">
          <Link href="/admin/users/new">
            <Plus className="size-4" />
            New user
          </Link>
        </Button>
      </div>

      {!users || users.length === 0 ? (
        <p className="border-border text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center text-sm">
          No users yet.
        </p>
      ) : (
        <div className="border-border rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.email}
                  </TableCell>
                  <TableCell>{ROLE_LABELS[user.role as UserRole]}</TableCell>
                  <TableCell>
                    <Badge variant={user.is_active ? "secondary" : "outline"}>
                      {user.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon-sm" asChild>
                      <Link href={`/admin/users/${user.id}/edit`}>
                        <Pencil className="size-4" />
                        <span className="sr-only">Edit {user.name}</span>
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
