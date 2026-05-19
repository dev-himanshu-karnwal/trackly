"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

type SaveResult = { error?: string; success?: boolean };

type TicketInlineSelectProps = {
  slug: string;
  ticketNumber: number;
  value: string;
  options: Option[];
  saveAction: (
    slug: string,
    ticketNumber: number,
    value: string
  ) => Promise<SaveResult>;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
};

export function TicketInlineSelect({
  slug,
  ticketNumber,
  value,
  options,
  saveAction,
  placeholder = "Select…",
  className,
  triggerClassName,
}: TicketInlineSelectProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Select
      value={value}
      disabled={pending}
      onValueChange={(next) => {
        if (next === value) return;
        startTransition(async () => {
          const result = await saveAction(slug, ticketNumber, next);
          if (result.error) {
            toast.error(result.error);
          } else {
            router.refresh();
          }
        });
      }}
    >
      <SelectTrigger
        className={cn(
          "bg-muted/40 hover:bg-muted/60 h-8 w-full border-transparent shadow-none",
          triggerClassName
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={className}>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
