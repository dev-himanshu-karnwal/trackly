"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ListFilter,
  Plus,
  Search,
} from "lucide-react";

import {
  PriorityBadge,
  StatusBadge,
  TypeBadge,
} from "@/components/tickets/ticket-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PRIORITY_LABELS, STATUS_LABELS, TYPE_LABELS } from "@/lib/constants";
import {
  comparePriority,
  formatTicketDate,
  formatTicketId,
} from "@/lib/tickets";
import type {
  TicketLabel,
  TicketPriority,
  TicketStatus,
  TicketType,
} from "@/types/database";

export type TicketListItem = {
  id: string;
  ticket_number: number;
  title: string;
  type: TicketType;
  status: TicketStatus;
  priority: TicketPriority;
  start_date: string | null;
  due_date: string | null;
  updated_at: string;
  created_at: string;
  assignee: { id: string; name: string } | null;
  labels: Pick<TicketLabel, "id" | "name" | "color">[];
};

type TicketListProps = {
  slug: string;
  projectSlug: string;
  tickets: TicketListItem[];
  members: { id: string; name: string }[];
  labels: TicketLabel[];
  canCreateTickets: boolean;
};

const PAGE_SIZE = 20;

const SORT_OPTIONS = [
  { value: "updated_at", label: "Updated" },
  { value: "created_at", label: "Created" },
  { value: "due_date", label: "Due date" },
  { value: "priority", label: "Priority" },
] as const;

type SortField = (typeof SORT_OPTIONS)[number]["value"];

export function TicketList({
  slug,
  projectSlug,
  tickets,
  members,
  labels,
  canCreateTickets,
}: TicketListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "all";
  const type = searchParams.get("type") ?? "all";
  const priority = searchParams.get("priority") ?? "all";
  const assignee = searchParams.get("assignee") ?? "all";
  const label = searchParams.get("label") ?? "all";
  const sort = (searchParams.get("sort") as SortField) || "updated_at";
  const order = searchParams.get("order") === "asc" ? "asc" : "desc";
  const page = Math.max(
    1,
    Number.parseInt(searchParams.get("page") ?? "1", 10) || 1
  );

  function setParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value == null || value === "" || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    if (!("page" in updates)) params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  const filtered = useMemo(() => {
    let list = [...tickets];

    if (q.trim()) {
      const lower = q.trim().toLowerCase();
      list = list.filter((t) => t.title.toLowerCase().includes(lower));
    }
    if (status !== "all") list = list.filter((t) => t.status === status);
    if (type !== "all") list = list.filter((t) => t.type === type);
    if (priority !== "all") list = list.filter((t) => t.priority === priority);
    if (assignee === "unassigned") {
      list = list.filter((t) => !t.assignee);
    } else if (assignee !== "all") {
      list = list.filter((t) => t.assignee?.id === assignee);
    }
    if (label !== "all") {
      list = list.filter((t) => t.labels.some((l) => l.id === label));
    }

    list.sort((a, b) => {
      if (sort === "priority") {
        const cmp = comparePriority(a.priority, b.priority);
        return order === "asc" ? -cmp : cmp;
      }
      if (sort === "due_date") {
        const aTime = a.due_date ? new Date(a.due_date).getTime() : null;
        const bTime = b.due_date ? new Date(b.due_date).getTime() : null;
        if (aTime == null && bTime == null) return 0;
        if (aTime == null) return 1;
        if (bTime == null) return -1;
        const diff = aTime - bTime;
        return order === "asc" ? diff : -diff;
      }
      const field = sort === "created_at" ? "created_at" : "updated_at";
      const diff = new Date(a[field]).getTime() - new Date(b[field]).getTime();
      return order === "asc" ? diff : -diff;
    });

    return list;
  }, [tickets, q, status, type, priority, assignee, label, sort, order]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const activeFilterCount = [status, type, priority, assignee, label].filter(
    (v) => v !== "all"
  ).length;
  const sortLabel =
    SORT_OPTIONS.find((o) => o.value === sort)?.label ?? "Updated";

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="border-border/80 bg-card/50 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tickets</h1>
          <p className="text-muted-foreground text-sm">
            {filtered.length} ticket{filtered.length === 1 ? "" : "s"} in this
            project
          </p>
        </div>
        {canCreateTickets && (
          <Button asChild>
            <Link href={`/projects/${slug}/tickets/new`}>
              <Plus className="mr-2 size-4" />
              New ticket
            </Link>
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
          <Input
            placeholder="Search by title…"
            className="pl-9"
            defaultValue={q}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setParams({
                  q: (e.target as HTMLInputElement).value,
                  page: "1",
                });
              }
            }}
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "bg-background hover:bg-muted/50 relative flex items-center gap-2 rounded-lg border px-3 py-2 text-sm shadow-sm transition-colors",
                activeFilterCount > 0 && "border-primary/30 bg-primary/5"
              )}
              aria-label="Open filters"
            >
              <ListFilter className="text-muted-foreground size-4" />
              <span className="font-medium">Filter</span>
              {activeFilterCount > 0 && (
                <Badge
                  variant="secondary"
                  className="h-5 min-w-5 px-1.5 text-xs"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 gap-3 p-3">
            <p className="text-sm font-medium">Filters</p>
            <div className="flex flex-col gap-3">
              <FilterField
                label="Status"
                value={status}
                onChange={(v) => setParams({ status: v, page: "1" })}
                options={[
                  { value: "all", label: "All statuses" },
                  ...Object.entries(STATUS_LABELS).map(([value, label]) => ({
                    value,
                    label,
                  })),
                ]}
              />
              <FilterField
                label="Type"
                value={type}
                onChange={(v) => setParams({ type: v, page: "1" })}
                options={[
                  { value: "all", label: "All types" },
                  ...Object.entries(TYPE_LABELS).map(([value, label]) => ({
                    value,
                    label,
                  })),
                ]}
              />
              <FilterField
                label="Priority"
                value={priority}
                onChange={(v) => setParams({ priority: v, page: "1" })}
                options={[
                  { value: "all", label: "All priorities" },
                  ...Object.entries(PRIORITY_LABELS).map(([value, label]) => ({
                    value,
                    label,
                  })),
                ]}
              />
              <FilterField
                label="Assignee"
                value={assignee}
                onChange={(v) => setParams({ assignee: v, page: "1" })}
                options={[
                  { value: "all", label: "All assignees" },
                  { value: "unassigned", label: "Unassigned" },
                  ...members.map((m) => ({ value: m.id, label: m.name })),
                ]}
              />
              {labels.length > 0 && (
                <FilterField
                  label="Label"
                  value={label}
                  onChange={(v) => setParams({ label: v, page: "1" })}
                  options={[
                    { value: "all", label: "All labels" },
                    ...labels.map((l) => ({ value: l.id, label: l.name })),
                  ]}
                />
              )}
            </div>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() =>
                  setParams({
                    status: null,
                    type: null,
                    priority: null,
                    assignee: null,
                    label: null,
                    page: "1",
                  })
                }
              >
                Clear filters
              </Button>
            )}
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="bg-background hover:bg-muted/50 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm shadow-sm transition-colors"
              aria-label="Open sort options"
            >
              <ArrowUpDown className="text-muted-foreground size-4" />
              <span className="font-medium">Sort</span>
              <span className="text-muted-foreground">
                {sortLabel}
                {order === "asc" ? (
                  <ArrowUp className="ml-1 inline size-3.5" />
                ) : (
                  <ArrowDown className="ml-1 inline size-3.5" />
                )}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 gap-3 p-3">
            <p className="text-sm font-medium">Sort by</p>
            <FilterField
              label="Field"
              value={sort}
              onChange={(v) => setParams({ sort: v, page: "1" })}
              options={SORT_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
            />
            <div className="space-y-1.5">
              <Label>Order</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={order === "asc" ? "default" : "outline"}
                  size="sm"
                  className="w-full"
                  onClick={() => setParams({ order: "asc", page: "1" })}
                >
                  <ArrowUp className="mr-1.5 size-3.5" />
                  Ascending
                </Button>
                <Button
                  type="button"
                  variant={order === "desc" ? "default" : "outline"}
                  size="sm"
                  className="w-full"
                  onClick={() => setParams({ order: "desc", page: "1" })}
                >
                  <ArrowDown className="mr-1.5 size-3.5" />
                  Descending
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Labels</TableHead>
              <TableHead className="text-right">Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-muted-foreground h-24 text-center"
                >
                  No tickets match your filters.
                </TableCell>
              </TableRow>
            ) : (
              pageItems.map((ticket) => (
                <TableRow key={ticket.id} className="hover:bg-muted/50">
                  <TableCell className="font-mono text-xs">
                    <Link
                      href={`/projects/${slug}/tickets/${ticket.ticket_number}`}
                      className="text-primary hover:underline"
                    >
                      {formatTicketId(projectSlug, ticket.ticket_number)}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-[280px] truncate font-medium">
                    <Link
                      href={`/projects/${slug}/tickets/${ticket.ticket_number}`}
                      className="hover:underline"
                    >
                      {ticket.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <TypeBadge type={ticket.type} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={ticket.status} />
                  </TableCell>
                  <TableCell>
                    <PriorityBadge priority={ticket.priority} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {ticket.assignee?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                    {formatTicketDate(ticket.due_date)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {ticket.labels.map((l) => (
                        <Badge
                          key={l.id}
                          className="border-0 text-white"
                          style={{ backgroundColor: l.color }}
                        >
                          {l.name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-right text-xs whitespace-nowrap">
                    {formatDistanceToNow(new Date(ticket.updated_at), {
                      addSuffix: true,
                    })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setParams({ page: String(currentPage - 1) })}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setParams({ page: String(currentPage + 1) })}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
