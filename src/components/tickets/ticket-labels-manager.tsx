"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { TicketLabel } from "@/types/database";
import { toast } from "sonner";

type TicketLabelsManagerProps = {
  slug: string;
  ticketNumber: number;
  allLabels: TicketLabel[];
  selectedLabelIds: string[];
  updateTicketLabels: (
    slug: string,
    ticketNumber: number,
    labelIds: string[]
  ) => Promise<{ error?: string; success?: boolean }>;
};

export function TicketLabelsManager({
  slug,
  ticketNumber,
  allLabels,
  selectedLabelIds,
  updateTicketLabels,
}: TicketLabelsManagerProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle(labelId: string) {
    const next = selectedLabelIds.includes(labelId)
      ? selectedLabelIds.filter((id) => id !== labelId)
      : [...selectedLabelIds, labelId];

    startTransition(async () => {
      const result = await updateTicketLabels(slug, ticketNumber, next);
      if (result.error) {
        toast.error(result.error);
      } else {
        router.refresh();
      }
    });
  }

  if (allLabels.length === 0) {
    return (
      <section className="space-y-2">
        <h3 className="text-muted-foreground text-sm font-medium">Labels</h3>
        <p className="text-muted-foreground text-sm">
          No labels defined for this project.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h3 className="text-muted-foreground text-sm font-medium">Labels</h3>
      <div className="flex flex-wrap gap-2">
        {selectedLabelIds.length === 0 ? (
          <span className="text-muted-foreground text-sm">None</span>
        ) : (
          allLabels
            .filter((l) => selectedLabelIds.includes(l.id))
            .map((label) => (
              <Badge
                key={label.id}
                className="border-0 text-white"
                style={{ backgroundColor: label.color }}
              >
                {label.name}
              </Badge>
            ))
        )}
      </div>
      <div className="space-y-2 rounded-md border p-3">
        <Label className="text-muted-foreground text-xs">Manage labels</Label>
        <div className="flex flex-col gap-2">
          {allLabels.map((label) => (
            <label
              key={label.id}
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <Checkbox
                checked={selectedLabelIds.includes(label.id)}
                disabled={pending}
                onCheckedChange={() => toggle(label.id)}
              />
              <span
                className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium text-white"
                style={{ backgroundColor: label.color }}
              >
                {label.name}
              </span>
            </label>
          ))}
        </div>
      </div>
    </section>
  );
}
