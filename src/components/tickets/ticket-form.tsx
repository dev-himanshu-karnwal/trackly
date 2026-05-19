"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { MarkdownEditor } from "@/components/tickets/markdown-editor";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRIORITY_LABELS, STATUS_LABELS, TYPE_LABELS } from "@/lib/constants";
import {
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  TICKET_TYPES,
  toDateInputValue,
} from "@/lib/tickets";
import type {
  Ticket,
  TicketLabel,
  TicketPriority,
  TicketStatus,
  TicketType,
} from "@/types/database";
import { toast } from "sonner";

type Assignee = { id: string; name: string };

type TicketFormProps = {
  slug: string;
  assignees: Assignee[];
  labels: TicketLabel[];
  mode: "create" | "edit";
  ticket?: Ticket;
  selectedLabelIds?: string[];
  action: (formData: FormData) => Promise<{ error?: string }>;
};

export function TicketForm({
  slug,
  assignees,
  labels,
  mode,
  ticket,
  selectedLabelIds = [],
  action,
}: TicketFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(ticket?.title ?? "");
  const [description, setDescription] = useState(ticket?.description ?? "");
  const [type, setType] = useState<TicketType>(ticket?.type ?? "bug");
  const [status, setStatus] = useState<TicketStatus>(
    ticket?.status ?? "backlog"
  );
  const [priority, setPriority] = useState<TicketPriority>(
    ticket?.priority ?? "medium"
  );
  const [assigneeId, setAssigneeId] = useState(ticket?.assignee_id ?? "none");
  const [startDate, setStartDate] = useState(
    toDateInputValue(ticket?.start_date)
  );
  const [dueDate, setDueDate] = useState(toDateInputValue(ticket?.due_date));
  const [labelIds, setLabelIds] = useState<string[]>(selectedLabelIds);

  function toggleLabel(id: string) {
    setLabelIds((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData();
    formData.set("title", title);
    formData.set("description", description);
    formData.set("type", type);
    formData.set("status", status);
    formData.set("priority", priority);
    formData.set("assignee_id", assigneeId);
    formData.set("start_date", startDate);
    formData.set("due_date", dueDate);
    labelIds.forEach((id) => formData.append("label_ids", id));

    startTransition(async () => {
      const result = await action(formData);
      if (result?.error) {
        toast.error(result.error);
      }
    });
  }

  const cancelHref =
    mode === "edit" && ticket
      ? `/projects/${slug}/tickets/${ticket.ticket_number}`
      : `/projects/${slug}`;

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          {mode === "create" ? "New ticket" : "Edit ticket"}
        </h1>
        <Button type="button" variant="outline" asChild>
          <Link href={cancelHref}>Cancel</Link>
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={150}
          required
          placeholder="Short summary"
        />
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <MarkdownEditor value={description} onChange={setDescription} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as TicketType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TICKET_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as TicketStatus)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TICKET_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Priority</Label>
          <Select
            value={priority}
            onValueChange={(v) => setPriority(v as TicketPriority)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TICKET_PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Assignee</Label>
          <Select value={assigneeId} onValueChange={setAssigneeId}>
            <SelectTrigger>
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Unassigned</SelectItem>
              {assignees.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="start_date">Start date</Label>
          <Input
            id="start_date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="due_date">Due date</Label>
          <Input
            id="due_date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
      </div>

      {labels.length > 0 && (
        <div className="space-y-2">
          <Label>Labels</Label>
          <div className="flex flex-wrap gap-3">
            {labels.map((label) => (
              <label
                key={label.id}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <Checkbox
                  checked={labelIds.includes(label.id)}
                  onCheckedChange={() => toggleLabel(label.id)}
                />
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium text-white"
                  style={{ backgroundColor: label.color }}
                >
                  {label.name}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending
            ? "Saving…"
            : mode === "create"
              ? "Create ticket"
              : "Save changes"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={pending}
        >
          Back
        </Button>
      </div>
    </form>
  );
}
