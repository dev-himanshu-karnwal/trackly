"use client";

import { InlineBlurField } from "@/components/tickets/inline-blur-field";

type SaveResult = { error?: string; success?: boolean };

type TicketInlineTitleProps = {
  slug: string;
  ticketNumber: number;
  title: string;
  saveAction: (
    slug: string,
    ticketNumber: number,
    title: string
  ) => Promise<SaveResult>;
};

export function TicketInlineTitle({
  slug,
  ticketNumber,
  title,
  saveAction,
}: TicketInlineTitleProps) {
  return (
    <InlineBlurField
      value={title}
      onSave={(value) => saveAction(slug, ticketNumber, value)}
      required
      inputClassName="h-auto border-0 px-0 py-1 text-2xl font-semibold tracking-tight shadow-none focus-visible:ring-offset-0"
      className="w-full"
    />
  );
}
