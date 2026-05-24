"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  imageMarkdown,
  insertImageMarkdownAtCursor,
  isAllowedTicketImage,
  uploadTicketImage,
} from "@/lib/ticket-images";
import { cn } from "@/lib/utils";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  className?: string;
  height?: number;
  projectId: string;
  ticketId?: string;
};

export function MarkdownEditor({
  value,
  onChange,
  onBlur,
  className,
  height = 280,
  projectId,
  ticketId,
}: MarkdownEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [extraCommands, setExtraCommands] = useState<
    NonNullable<React.ComponentProps<typeof MDEditor>["extraCommands"]>
  >([]);

  const handleUpload = useCallback(
    async (file: File) => {
      if (!isAllowedTicketImage(file)) {
        toast.error("Only JPEG, PNG, GIF, and WebP images are supported.");
        return;
      }

      setUploading(true);
      const result = await uploadTicketImage(file, projectId, ticketId);
      setUploading(false);

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      insertImageMarkdownAtCursor(
        value,
        onChange,
        imageMarkdown(result.url, file.name.replace(/\.[^.]+$/, "")),
        containerRef.current
      );
    },
    [onChange, projectId, ticketId, value]
  );

  useEffect(() => {
    let cancelled = false;

    void import("@uiw/react-md-editor").then(({ commands }) => {
      if (cancelled) return;

      const imageUploadCommand = {
        name: "image-upload",
        keyCommand: "image-upload",
        buttonProps: {
          "aria-label": "Upload image",
          title: "Upload image",
          disabled: uploading,
        },
        icon: uploading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <ImageIcon className="size-3.5" />
        ),
        execute: () => {
          fileInputRef.current?.click();
        },
      };

      setExtraCommands([imageUploadCommand, commands.help]);
    });

    return () => {
      cancelled = true;
    };
  }, [uploading]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onPaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (!item.type.startsWith("image/")) continue;
        const file = item.getAsFile();
        if (!file) continue;
        event.preventDefault();
        void handleUpload(file);
        return;
      }
    };

    container.addEventListener("paste", onPaste);
    return () => container.removeEventListener("paste", onPaste);
  }, [handleUpload]);

  return (
    <div
      ref={containerRef}
      data-color-mode="light"
      className={cn(
        "border-border/80 w-full overflow-hidden rounded-lg border shadow-inner",
        "[&_.w-md-editor-toolbar]:bg-muted/50 [&_.w-md-editor]:rounded-lg [&_.w-md-editor]:border-0 [&_.w-md-editor-toolbar]:border-b",
        "[&_.wmde-markdown_img]:mx-auto [&_.wmde-markdown_img]:block [&_.wmde-markdown_img]:max-h-80 [&_.wmde-markdown_img]:max-w-full [&_.wmde-markdown_img]:rounded-lg",
        className
      )}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          onBlur?.();
        }
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void handleUpload(file);
        }}
      />
      <MDEditor
        value={value}
        onChange={(v) => onChange(v ?? "")}
        preview="live"
        height={height}
        visibleDragbar={false}
        extraCommands={extraCommands}
        textareaProps={{
          placeholder:
            "Write in Markdown… Paste or upload images (JPEG, PNG, GIF, WebP).",
        }}
      />
    </div>
  );
}
