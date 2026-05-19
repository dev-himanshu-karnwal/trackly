"use client";

import dynamic from "next/dynamic";

import { cn } from "@/lib/utils";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  className?: string;
  height?: number;
};

export function MarkdownEditor({
  value,
  onChange,
  onBlur,
  className,
  height = 280,
}: MarkdownEditorProps) {
  return (
    <div
      data-color-mode="light"
      className={cn(
        "border-border/80 w-full overflow-hidden rounded-lg border shadow-inner",
        "[&_.w-md-editor-toolbar]:bg-muted/50 [&_.w-md-editor]:rounded-lg [&_.w-md-editor]:border-0 [&_.w-md-editor-toolbar]:border-b",
        className
      )}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          onBlur?.();
        }
      }}
    >
      <MDEditor
        value={value}
        onChange={(v) => onChange(v ?? "")}
        preview="live"
        height={height}
        visibleDragbar={false}
        textareaProps={{ placeholder: "Write in Markdown…" }}
      />
    </div>
  );
}
