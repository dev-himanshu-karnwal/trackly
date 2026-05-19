import Link from "next/link";
import { cookies } from "next/headers";
import {
  AlertCircle,
  ArrowRight,
  CircleDot,
  FolderKanban,
  LayoutDashboard,
  Settings,
  UserCheck,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PriorityBadge, StatusBadge } from "@/components/tickets/ticket-badges";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getProfile, requireAuth } from "@/lib/auth";
import {
  computeDashboardStats,
  computeStatusCounts,
  getDashboardTickets,
} from "@/lib/dashboard";
import { getUserProjects } from "@/lib/projects";
import { formatTicketDate, formatTicketId } from "@/lib/tickets";
import { createClient } from "@/utils/supabase/server";

function StatCard({
  label,
  value,
  description,
  icon: Icon,
}: {
  label: string;
  value: number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card size="sm" className="shadow-sm">
      <CardContent className="flex items-start gap-4 pt-0">
        <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold tracking-tight tabular-nums">
            {value}
          </p>
          <p className="text-foreground font-medium">{label}</p>
          <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const user = await requireAuth();
  const profile = await getProfile();
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const projects = await getUserProjects(supabase, user.id, profile?.role);
  const projectIds = projects.map((p) => p.id);
  const tickets = await getDashboardTickets(supabase, projectIds);
  const stats = computeDashboardStats(tickets, user.id, projects.length);
  const statusCounts = computeStatusCounts(tickets);
  const recentTickets = tickets.slice(0, 10);

  const displayName = profile?.name?.split(/\s+/)[0] ?? "there";

  return (
    <AppShell>
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8">
          <div className="text-primary flex items-center gap-2">
            <LayoutDashboard className="size-5" />
            <span className="text-sm font-medium">Dashboard</span>
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Hello, {displayName}
          </h1>
          <p className="text-muted-foreground mt-1">
            Overview across{" "}
            {stats.projectCount === 1 ? "your project" : "your projects"}
          </p>
        </div>

        <section className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Projects"
            value={stats.projectCount}
            description="Active workspaces you can access"
            icon={FolderKanban}
          />
          <StatCard
            label="Open tickets"
            value={stats.openTickets}
            description="Not marked as done"
            icon={CircleDot}
          />
          <StatCard
            label="Assigned to you"
            value={stats.assignedToMe}
            description="Open tickets on your plate"
            icon={UserCheck}
          />
          <StatCard
            label="Due soon"
            value={stats.dueSoon}
            description="Due within 7 days or overdue"
            icon={AlertCircle}
          />
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between border-b">
                <div>
                  <CardTitle>Recent tickets</CardTitle>
                  <CardDescription>
                    Last updated across your projects
                  </CardDescription>
                </div>
                <Link
                  href="/projects"
                  className="text-primary flex items-center gap-1 text-sm font-medium hover:underline"
                >
                  All projects
                  <ArrowRight className="size-3.5" />
                </Link>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                {recentTickets.length === 0 ? (
                  <p className="text-muted-foreground px-4 py-8 text-center text-sm">
                    No tickets yet. Open a project to create one.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-4">Ticket</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden sm:table-cell">
                          Priority
                        </TableHead>
                        <TableHead className="hidden md:table-cell">
                          Due
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentTickets.map((ticket) => (
                        <TableRow key={ticket.id}>
                          <TableCell className="max-w-[200px] pl-4">
                            <Link
                              href={`/projects/${ticket.project.slug}/tickets/${ticket.ticket_number}`}
                              className="hover:text-primary block truncate font-medium"
                            >
                              <span className="text-muted-foreground font-mono text-xs">
                                {formatTicketId(
                                  ticket.project.slug,
                                  ticket.ticket_number
                                )}
                              </span>
                              <span className="mt-0.5 block truncate">
                                {ticket.title}
                              </span>
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Link
                              href={`/projects/${ticket.project.slug}`}
                              className="text-muted-foreground hover:text-primary"
                            >
                              {ticket.project.name}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={ticket.status} />
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <PriorityBadge priority={ticket.priority} />
                          </TableCell>
                          <TableCell className="text-muted-foreground hidden md:table-cell">
                            {formatTicketDate(ticket.due_date)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {stats.assignedToMe > 0 ? (
              <Card>
                <CardHeader className="border-b">
                  <CardTitle>Your open tickets</CardTitle>
                  <CardDescription>
                    Assigned to you and not done
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-0 pb-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-4">Ticket</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden sm:table-cell">
                          Due
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tickets
                        .filter(
                          (t) =>
                            t.assignee_id === user.id && t.status !== "done"
                        )
                        .slice(0, 8)
                        .map((ticket) => (
                          <TableRow key={ticket.id}>
                            <TableCell className="max-w-[240px] pl-4">
                              <Link
                                href={`/projects/${ticket.project.slug}/tickets/${ticket.ticket_number}`}
                                className="hover:text-primary block truncate font-medium"
                              >
                                <span className="text-muted-foreground font-mono text-xs">
                                  {formatTicketId(
                                    ticket.project.slug,
                                    ticket.ticket_number
                                  )}
                                </span>
                                <span className="mt-0.5 block truncate">
                                  {ticket.title}
                                </span>
                              </Link>
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={ticket.status} />
                            </TableCell>
                            <TableCell className="text-muted-foreground hidden sm:table-cell">
                              {formatTicketDate(ticket.due_date)}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : null}
          </div>

          <aside className="space-y-6">
            <Card size="sm">
              <CardHeader>
                <CardTitle>Tickets by status</CardTitle>
                <CardDescription>Counts across all projects</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Table>
                  <TableBody>
                    {statusCounts.map(({ status, count }) => (
                      <TableRow key={status}>
                        <TableCell className="py-2 pl-0">
                          <StatusBadge status={status} />
                        </TableCell>
                        <TableCell className="py-2 pr-0 text-right font-medium tabular-nums">
                          {count}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader>
                <CardTitle>Projects</CardTitle>
                <CardDescription>Jump into a project</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 pt-0">
                {projects.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No projects available.
                  </p>
                ) : (
                  projects.slice(0, 8).map((project) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.slug}`}
                      className="hover:bg-muted flex items-center justify-between rounded-lg px-2 py-2 text-sm transition-colors"
                    >
                      <span className="truncate font-medium">
                        {project.name}
                      </span>
                      <ArrowRight className="text-muted-foreground size-3.5 shrink-0" />
                    </Link>
                  ))
                )}
                <Link
                  href="/projects"
                  className="text-primary mt-2 flex items-center gap-1 px-2 text-sm font-medium hover:underline"
                >
                  View all projects
                  <ArrowRight className="size-3.5" />
                </Link>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader>
                <CardTitle>Quick links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 pt-0">
                <Link
                  href="/settings"
                  className="hover:bg-muted flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors"
                >
                  <Settings className="text-muted-foreground size-4" />
                  Settings
                </Link>
                {profile?.role === "admin" ? (
                  <Link
                    href="/admin/users"
                    className="hover:bg-muted flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors"
                  >
                    <UserCheck className="text-muted-foreground size-4" />
                    Admin panel
                  </Link>
                ) : null}
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </AppShell>
  );
}
