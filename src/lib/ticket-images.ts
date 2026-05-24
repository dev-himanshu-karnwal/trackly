import { createClient } from "@/utils/supabase/client";

export const TICKET_IMAGES_BUCKET = "ticket-images";

export const MAX_TICKET_IMAGE_BYTES = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

export function isAllowedTicketImage(file: File): boolean {
  if (!file.type.startsWith("image/")) return false;
  if (file.type.startsWith("image/svg")) return false;
  return ALLOWED_IMAGE_TYPES.has(file.type);
}

export function validateTicketImage(file: File): string | null {
  if (!isAllowedTicketImage(file)) {
    return "Only JPEG, PNG, GIF, and WebP images are supported.";
  }
  if (file.size > MAX_TICKET_IMAGE_BYTES) {
    return "Image must be 5 MB or smaller.";
  }
  return null;
}

function buildStoragePath(
  projectId: string,
  ticketId: string | undefined,
  file: File
): string {
  const folder = ticketId ?? "draft";
  const ext = EXT_BY_MIME[file.type] ?? "png";
  return `${projectId}/${folder}/${crypto.randomUUID()}.${ext}`;
}

export function imageMarkdown(url: string, alt = "image"): string {
  return `![${alt}](${url})`;
}

export async function uploadTicketImage(
  file: File,
  projectId: string,
  ticketId?: string
): Promise<{ url: string } | { error: string }> {
  const validationError = validateTicketImage(file);
  if (validationError) return { error: validationError };

  const supabase = createClient();
  const path = buildStoragePath(projectId, ticketId, file);

  const { error } = await supabase.storage
    .from(TICKET_IMAGES_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (error) return { error: error.message };

  const { data } = supabase.storage
    .from(TICKET_IMAGES_BUCKET)
    .getPublicUrl(path);

  return { url: data.publicUrl };
}

export function insertImageMarkdownAtCursor(
  value: string,
  onChange: (value: string) => void,
  markdown: string,
  container?: HTMLElement | null
) {
  const textarea =
    container?.querySelector("textarea") ??
    (document.querySelector(
      ".w-md-editor-text textarea"
    ) as HTMLTextAreaElement | null);

  const snippet = `\n\n${markdown}\n\n`;

  if (textarea) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const next = value.slice(0, start) + snippet + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      const pos = start + snippet.length;
      textarea.selectionStart = pos;
      textarea.selectionEnd = pos;
      textarea.focus();
    });
    return;
  }

  onChange(value.trimEnd() + snippet);
}
