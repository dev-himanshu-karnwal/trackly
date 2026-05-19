"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_LABELS } from "@/lib/constants";
import { TICKET_STATUSES } from "@/lib/tickets";
import type { TicketStatus } from "@/types/database";
import { toast } from "sonner";

type TicketStatusSelectProps = {
  slug: string;
  ticketNumber: number;
  status: TicketStatus;
  changeStatus: (
    slug: string,
    ticketNumber: number,
    status: TicketStatus
  ) => Promise<{ error?: string; success?: boolean }>;
};

export function TicketStatusSelect({
  slug,
  ticketNumber,
  status,
  changeStatus,
}: TicketStatusSelectProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Select
      value={status}
      disabled={pending}
      onValueChange={(value) => {
        startTransition(async () => {
          const result = await changeStatus(
            slug,
            ticketNumber,
            value as TicketStatus
          );
          if (result.error) {
            toast.error(result.error);
          } else {
            router.refresh();
          }
        });
      }}
    >
      <SelectTrigger className="w-[160px]">
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
  );
}
