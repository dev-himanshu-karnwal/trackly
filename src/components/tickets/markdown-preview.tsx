"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

import { MarkdownImage } from "@/components/tickets/markdown-image";
import { cn } from "@/lib/utils";

const Markdown = dynamic(
  () => import("@uiw/react-md-editor").then((mod) => mod.default.Markdown),
  {
    ssr: false,
    loading: () => <p className="text-muted-foreground text-sm">Loading…</p>,
  }
);

type MarkdownPreviewProps = {
  source: string;
  className?: string;
};

export function MarkdownPreview({ source, className }: MarkdownPreviewProps) {
  const components = useMemo(
    () => ({
      img: ({ src, alt, title }: React.ImgHTMLAttributes<HTMLImageElement>) => (
        <MarkdownImage
          src={typeof src === "string" ? src : undefined}
          alt={alt}
          title={title}
        />
      ),
    }),
    []
  );

  if (!source.trim()) {
    return (
      <p className="text-muted-foreground text-sm italic">
        No description yet. Click Edit to add details.
      </p>
    );
  }

  return (
    <div
      data-color-mode="light"
      className={cn(
        "wmde-markdown-var prose-ticket text-foreground",
        className
      )}
    >
      <Markdown source={source} components={components} />
    </div>
  );
}
