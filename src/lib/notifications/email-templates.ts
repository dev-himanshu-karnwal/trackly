import { STATUS_LABELS } from "@/lib/constants";
import type { TicketStatus } from "@/types/database";

export interface EmailTemplateContext {
  recipientName: string;
  actorName: string;
  ticketTitle: string;
  ticketNumber: number;
  projectName: string;
  ticketUrl: string;
  previousStatus?: string;
  newStatus?: string;
  commentPreview?: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function statusLabel(status: string): string {
  return STATUS_LABELS[status as TicketStatus] ?? status;
}

const BRAND = "#4f46e5";
const BRAND_LIGHT = "#eef2ff";
const TEXT = "#18181b";
const MUTED = "#71717a";

function layout(body: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:${TEXT};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:${BRAND};padding:20px 24px;">
              <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">Trackly</span>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px;">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;background:${BRAND_LIGHT};border-top:1px solid #e4e4e7;">
              <p style="margin:0;font-size:12px;color:${MUTED};">You received this because of activity on a ticket you follow.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

function ticketCard(ctx: EmailTemplateContext): string {
  return `
    <div style="margin:20px 0;padding:16px;background:${BRAND_LIGHT};border-radius:8px;border-left:4px solid ${BRAND};">
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:${BRAND};text-transform:uppercase;letter-spacing:0.05em;">#${ctx.ticketNumber} · ${escapeHtml(ctx.projectName)}</p>
      <p style="margin:0;font-size:18px;font-weight:600;color:${TEXT};">${escapeHtml(ctx.ticketTitle)}</p>
    </div>`;
}

function ticketLink(url: string, label: string): string {
  return `<p style="margin:24px 0 0;"><a href="${escapeHtml(url)}" style="display:inline-block;padding:10px 20px;background:${BRAND};color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;border-radius:8px;">${escapeHtml(label)}</a></p>`;
}

function commentBlock(preview: string): string {
  const escaped = escapeHtml(preview);
  return `
    <div style="margin:16px 0;padding:16px;background:#fafafa;border-radius:8px;border:1px solid #e4e4e7;">
      <p style="margin:0 0 8px;font-size:11px;font-weight:600;color:${MUTED};text-transform:uppercase;">Comment preview</p>
      <p style="margin:0;font-size:14px;color:#3f3f46;white-space:pre-wrap;">${escaped}</p>
    </div>`;
}

export function assignedTemplate(ctx: EmailTemplateContext) {
  const subject = `[Trackly] You were assigned #${ctx.ticketNumber}: ${ctx.ticketTitle}`;
  const html = layout(`
    <p style="margin:0 0 12px;font-size:15px;">Hi ${escapeHtml(ctx.recipientName)},</p>
    <p style="margin:0 0 8px;font-size:15px;"><strong>${escapeHtml(ctx.actorName)}</strong> assigned you to a ticket:</p>
    ${ticketCard(ctx)}
    ${ticketLink(ctx.ticketUrl, "View ticket")}
  `);
  const text = `Hi ${ctx.recipientName},

${ctx.actorName} assigned you to #${ctx.ticketNumber} in ${ctx.projectName}: ${ctx.ticketTitle}

View ticket: ${ctx.ticketUrl}`;

  return { subject, html, text };
}

export function reassignedTemplate(ctx: EmailTemplateContext) {
  const subject = `[Trackly] Ticket reassigned to you #${ctx.ticketNumber}: ${ctx.ticketTitle}`;
  const html = layout(`
    <p style="margin:0 0 12px;font-size:15px;">Hi ${escapeHtml(ctx.recipientName)},</p>
    <p style="margin:0 0 8px;font-size:15px;"><strong>${escapeHtml(ctx.actorName)}</strong> reassigned this ticket to you:</p>
    ${ticketCard(ctx)}
    ${ticketLink(ctx.ticketUrl, "View ticket")}
  `);
  const text = `Hi ${ctx.recipientName},

${ctx.actorName} reassigned #${ctx.ticketNumber} to you in ${ctx.projectName}: ${ctx.ticketTitle}

View ticket: ${ctx.ticketUrl}`;

  return { subject, html, text };
}

export function statusChangedTemplate(ctx: EmailTemplateContext) {
  const from = ctx.previousStatus ? statusLabel(ctx.previousStatus) : "—";
  const to = ctx.newStatus ? statusLabel(ctx.newStatus) : "—";
  const subject = `[Trackly] Status updated #${ctx.ticketNumber}: ${ctx.ticketTitle}`;
  const html = layout(`
    <p style="margin:0 0 12px;font-size:15px;">Hi ${escapeHtml(ctx.recipientName)},</p>
    <p style="margin:0 0 8px;font-size:15px;"><strong>${escapeHtml(ctx.actorName)}</strong> changed status from <strong>${escapeHtml(from)}</strong> to <strong>${escapeHtml(to)}</strong>:</p>
    ${ticketCard(ctx)}
    ${ticketLink(ctx.ticketUrl, "View ticket")}
  `);
  const text = `Hi ${ctx.recipientName},

${ctx.actorName} changed #${ctx.ticketNumber} in ${ctx.projectName} from ${from} to ${to}: ${ctx.ticketTitle}

View ticket: ${ctx.ticketUrl}`;

  return { subject, html, text };
}

export function commentAddedTemplate(ctx: EmailTemplateContext) {
  const preview = ctx.commentPreview
    ? ctx.commentPreview.slice(0, 200) +
      (ctx.commentPreview.length > 200 ? "…" : "")
    : "";
  const subject = `[Trackly] New comment on #${ctx.ticketNumber}: ${ctx.ticketTitle}`;
  const html = layout(`
    <p style="margin:0 0 12px;font-size:15px;">Hi ${escapeHtml(ctx.recipientName)},</p>
    <p style="margin:0 0 8px;font-size:15px;"><strong>${escapeHtml(ctx.actorName)}</strong> commented on:</p>
    ${ticketCard(ctx)}
    ${preview ? commentBlock(preview) : ""}
    ${ticketLink(ctx.ticketUrl, "View comment")}
  `);
  const text = `Hi ${ctx.recipientName},

${ctx.actorName} commented on #${ctx.ticketNumber} in ${ctx.projectName}: ${ctx.ticketTitle}
${preview ? `\n"${preview}"\n` : ""}
View ticket: ${ctx.ticketUrl}`;

  return { subject, html, text };
}

export function userWelcomeTemplate(ctx: {
  recipientName: string;
  appUrl: string;
}) {
  const subject = "Welcome to Trackly";
  const html = layout(`
    <p style="margin:0 0 12px;font-size:15px;">Hi ${escapeHtml(ctx.recipientName)},</p>
    <p style="margin:0 0 8px;font-size:15px;">Your Trackly account is ready. Sign in to view your projects and tickets.</p>
    ${ticketLink(ctx.appUrl, "Open Trackly")}
  `);
  const text = `Hi ${ctx.recipientName},

Welcome to Trackly! Sign in at ${ctx.appUrl}`;

  return { subject, html, text };
}

export type EmailTemplateType =
  | "assigned"
  | "reassigned"
  | "status_changed"
  | "comment_added"
  | "user_welcome";

export function buildEmail(
  type: EmailTemplateType,
  ctx: EmailTemplateContext & { appUrl?: string }
) {
  switch (type) {
    case "assigned":
      return assignedTemplate(ctx);
    case "reassigned":
      return reassignedTemplate(ctx);
    case "status_changed":
      return statusChangedTemplate(ctx);
    case "comment_added":
      return commentAddedTemplate(ctx);
    case "user_welcome":
      return userWelcomeTemplate({
        recipientName: ctx.recipientName,
        appUrl: ctx.appUrl ?? ctx.ticketUrl,
      });
  }
}
