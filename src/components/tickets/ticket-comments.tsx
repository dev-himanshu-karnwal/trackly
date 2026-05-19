"use client";

import { useRef, useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { Eye, MessageSquarePlus, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { MarkdownPreview } from "@/components/tickets/markdown-preview";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
export type CommentWithAuthor = {
  id: string;
  body: string;
  created_at: string;
  author: { name: string } | null;
};

type TicketCommentsProps = {
  slug: string;
  ticketNumber: number;
  comments: CommentWithAuthor[];
  addComment: (
    slug: string,
    ticketNumber: number,
    formData: FormData
  ) => Promise<{ error?: string; success?: boolean }>;
};

function commentInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function TicketComments({
  slug,
  ticketNumber,
  comments,
  addComment,
}: TicketCommentsProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [body, setBody] = useState("");
  const [composeTab, setComposeTab] = useState<"write" | "preview">("write");
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!body.trim()) {
      toast.error("Comment cannot be empty");
      return;
    }
    const formData = new FormData();
    formData.set("body", body.trim());
    startTransition(async () => {
      const result = await addComment(slug, ticketNumber, formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        setBody("");
        setComposeTab("write");
        formRef.current?.reset();
        router.refresh();
      }
    });
  }

  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <MessageSquarePlus className="text-primary size-5" />
        Comments
        <span className="text-muted-foreground text-sm font-normal">
          ({comments.length})
        </span>
      </h2>

      {comments.length === 0 ? (
        <p className="border-border bg-muted/20 text-muted-foreground rounded-lg border border-dashed px-4 py-6 text-center text-sm">
          No comments yet. Be the first to reply.
        </p>
      ) : (
        <ul className="space-y-3">
          {comments.map((comment) => (
            <li
              key={comment.id}
              className="border-border/80 bg-card flex gap-3 rounded-xl border p-4 shadow-sm"
            >
              <Avatar className="size-9 shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                  {commentInitials(comment.author?.name ?? "?")}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium">
                    {comment.author?.name ?? "Unknown"}
                  </span>
                  <time
                    className="text-muted-foreground"
                    dateTime={comment.created_at}
                  >
                    {formatDistanceToNow(new Date(comment.created_at), {
                      addSuffix: true,
                    })}
                  </time>
                </div>
                <MarkdownPreview
                  source={comment.body}
                  className="prose-ticket text-sm"
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="border-primary/20 bg-card overflow-hidden rounded-xl border shadow-sm"
      >
        <Tabs
          value={composeTab}
          onValueChange={(v) => setComposeTab(v as "write" | "preview")}
          className="gap-0"
        >
          <div className="border-border bg-muted/30 flex items-center justify-between border-b px-3">
            <TabsList className="h-10 bg-transparent p-0">
              <TabsTrigger
                value="write"
                className="data-[state=active]:border-primary gap-1.5 rounded-none border-b-2 border-transparent px-3 data-[state=active]:bg-transparent"
              >
                <Pencil className="size-3.5" />
                Write
              </TabsTrigger>
              <TabsTrigger
                value="preview"
                className="data-[state=active]:border-primary gap-1.5 rounded-none border-b-2 border-transparent px-3 data-[state=active]:bg-transparent"
              >
                <Eye className="size-3.5" />
                Preview
              </TabsTrigger>
            </TabsList>
            <p className="text-muted-foreground text-xs">Markdown supported</p>
          </div>

          <TabsContent value="write" className="mt-0 p-0">
            <Textarea
              name="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Share an update, ask a question, or leave feedback…"
              rows={5}
              required
              disabled={pending}
              className="bg-background/50 min-h-[140px] resize-y rounded-none border-0 shadow-none focus-visible:ring-0"
            />
          </TabsContent>
          <TabsContent value="preview" className="mt-0 min-h-[140px] p-4">
            {body.trim() ? (
              <MarkdownPreview source={body} className="prose-ticket text-sm" />
            ) : (
              <p className="text-muted-foreground text-sm italic">
                Nothing to preview yet.
              </p>
            )}
          </TabsContent>
        </Tabs>

        <div className="border-border bg-muted/20 flex justify-end border-t px-3 py-2">
          <Button type="submit" size="sm" disabled={pending || !body.trim()}>
            {pending ? "Posting…" : "Post comment"}
          </Button>
        </div>
      </form>
    </section>
  );
}
