"use client";

import { useCallback, useState, useTransition } from "react";
import { Eye, Loader2, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { MarkdownEditor } from "@/components/tickets/markdown-editor";
import { MarkdownPreview } from "@/components/tickets/markdown-preview";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SaveResult = { error?: string; success?: boolean };

type TicketInlineDescriptionProps = {
  slug: string;
  ticketNumber: number;
  projectId: string;
  ticketId: string;
  description: string;
  saveAction: (
    slug: string,
    ticketNumber: number,
    description: string
  ) => Promise<SaveResult>;
};

export function TicketInlineDescription({
  slug,
  ticketNumber,
  projectId,
  ticketId,
  description,
  saveAction,
}: TicketInlineDescriptionProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(description);
  const [pending, startTransition] = useTransition();

  const save = useCallback(() => {
    const trimmed = local.trim();
    if (trimmed === description.trim()) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const result = await saveAction(slug, ticketNumber, trimmed);
      if (result.error) {
        toast.error(result.error);
        setLocal(description);
      } else {
        setEditing(false);
        router.refresh();
      }
    });
  }, [local, description, saveAction, slug, ticketNumber, router]);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Description</h2>
        <div className="flex gap-1">
          {!editing ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground h-8 gap-1.5"
              onClick={() => {
                setLocal(description);
                setEditing(true);
              }}
            >
              <Pencil className="size-3.5" />
              Edit
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5"
                onClick={() => {
                  setLocal(description);
                  setEditing(false);
                }}
                disabled={pending}
              >
                <Eye className="size-3.5" />
                Preview
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8"
                onClick={save}
                disabled={pending}
              >
                {pending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  "Save"
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      <div
        className={cn(
          "rounded-xl border transition-colors",
          editing
            ? "border-primary/30 bg-card p-4 shadow-sm"
            : "border-border/60 bg-muted/20 p-5"
        )}
      >
        {editing ? (
          <MarkdownEditor
            value={local}
            onChange={setLocal}
            onBlur={save}
            projectId={projectId}
            ticketId={ticketId}
            className="min-h-[200px]"
          />
        ) : (
          <MarkdownPreview source={description} className="prose-ticket" />
        )}
      </div>
    </section>
  );
}
