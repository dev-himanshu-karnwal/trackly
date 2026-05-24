"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Expand, Loader2, Minus, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

type MarkdownImageProps = {
  src?: string;
  alt?: string;
  title?: string;
  className?: string;
};

export function MarkdownImage({
  src,
  alt = "",
  title,
  className,
}: MarkdownImageProps) {
  const [expanded, setExpanded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);

  const clampZoom = useCallback(
    (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value)),
    []
  );

  const open = useCallback(() => {
    setZoom(1);
    setExpanded(true);
  }, []);

  const close = useCallback(() => {
    setExpanded(false);
    setZoom(1);
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "+" || event.key === "=") {
        setZoom((z) => clampZoom(z + ZOOM_STEP));
      }
      if (event.key === "-") {
        setZoom((z) => clampZoom(z - ZOOM_STEP));
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [expanded, close, clampZoom]);

  useEffect(() => {
    if (!expanded || !viewportRef.current) return;

    const viewport = viewportRef.current;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const delta = event.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setZoom((z) => clampZoom(z + delta));
    };

    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, [expanded, clampZoom]);

  if (!src || error) {
    return (
      <span className="text-muted-foreground bg-muted/50 my-3 inline-block rounded-md px-3 py-2 text-sm">
        {alt || "Image unavailable"}
      </span>
    );
  }

  return (
    <>
      <figure className={cn("ticket-markdown-image group my-4", className)}>
        <button
          type="button"
          onClick={open}
          className="border-border/60 bg-muted/20 relative block w-full overflow-hidden rounded-lg border text-left"
          aria-label={alt ? `Expand image: ${alt}` : "Expand image"}
        >
          {loading && (
            <div className="bg-muted/40 absolute inset-0 flex items-center justify-center">
              <Loader2 className="text-muted-foreground size-5 animate-spin" />
            </div>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            title={title}
            className={cn(
              "mx-auto block max-h-[480px] w-auto max-w-full object-contain transition-opacity",
              loading ? "opacity-0" : "opacity-100"
            )}
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setError(true);
            }}
          />
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
            <span className="bg-background/95 text-foreground flex translate-y-1 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium opacity-0 shadow-md transition-all group-hover:translate-y-0 group-hover:opacity-100">
              <Expand className="size-3.5" />
              View
            </span>
          </span>
        </button>
        {alt ? (
          <figcaption className="text-muted-foreground mt-2 text-center text-xs">
            {alt}
          </figcaption>
        ) : null}
      </figure>

      {expanded ? (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/90"
          role="dialog"
          aria-modal="true"
          aria-label={alt || "Image viewer"}
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <p className="truncate text-sm text-white/80">{alt || "Image"}</p>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-white hover:bg-white/10 hover:text-white"
                onClick={() => setZoom((z) => clampZoom(z - ZOOM_STEP))}
                disabled={zoom <= MIN_ZOOM}
                aria-label="Zoom out"
              >
                <Minus className="size-4" />
              </Button>
              <span className="min-w-14 text-center text-xs text-white/70 tabular-nums">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-white hover:bg-white/10 hover:text-white"
                onClick={() => setZoom((z) => clampZoom(z + ZOOM_STEP))}
                disabled={zoom >= MAX_ZOOM}
                aria-label="Zoom in"
              >
                <Plus className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-white hover:bg-white/10 hover:text-white"
                onClick={close}
                aria-label="Close"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>
          <div
            ref={viewportRef}
            className="flex flex-1 items-center justify-center overflow-auto px-4 pb-6"
            onClick={(event) => {
              if (event.target === event.currentTarget) close();
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              draggable={false}
              className="max-w-none transition-transform duration-150 ease-out select-none"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "center center",
              }}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
