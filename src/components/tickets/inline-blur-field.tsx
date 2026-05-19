"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type SaveResult = { error?: string; success?: boolean };

type InlineBlurInputProps = {
  value: string;
  onSave: (value: string) => Promise<SaveResult>;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  required?: boolean;
  multiline?: boolean;
  rows?: number;
};

export function InlineBlurField({
  value,
  onSave,
  placeholder,
  className,
  inputClassName,
  required = false,
  multiline = false,
  rows = 4,
}: InlineBlurInputProps) {
  const router = useRouter();
  const [local, setLocal] = useState(value);
  const [focused, setFocused] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!focused) setLocal(value);
  }, [value, focused]);

  function commit() {
    const trimmed = local.trim();
    if (required && !trimmed) {
      toast.error("This field cannot be empty");
      setLocal(value);
      return;
    }
    if (trimmed === value.trim()) return;

    startTransition(async () => {
      const result = await onSave(trimmed);
      if (result.error) {
        toast.error(result.error);
        setLocal(value);
      } else {
        router.refresh();
      }
    });
  }

  const sharedProps = {
    value: local,
    disabled: pending,
    placeholder,
    onFocus: () => setFocused(true),
    onBlur: () => {
      setFocused(false);
      commit();
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      if (!multiline && e.key === "Enter") {
        e.preventDefault();
        (e.target as HTMLElement).blur();
      }
      if (e.key === "Escape") {
        setLocal(value);
        (e.target as HTMLElement).blur();
      }
    },
    className: cn(
      "transition-shadow focus-visible:ring-2 focus-visible:ring-primary/30",
      focused && "border-primary/40 bg-background shadow-sm",
      !focused && "border-transparent bg-muted/40 hover:bg-muted/60",
      inputClassName
    ),
  };

  return (
    <div className={cn("relative", className)}>
      {multiline ? (
        <Textarea
          {...sharedProps}
          rows={rows}
          onChange={(e) => setLocal(e.target.value)}
        />
      ) : (
        <Input {...sharedProps} onChange={(e) => setLocal(e.target.value)} />
      )}
      {pending ? (
        <Loader2 className="text-muted-foreground absolute top-3 right-3 size-4 animate-spin" />
      ) : null}
    </div>
  );
}
