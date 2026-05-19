import { formatDistanceToNow } from "date-fns";

import { formatTicketDate } from "@/lib/tickets";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/constants";
import type {
  ActivityLog,
  Json,
  TicketPriority,
  TicketStatus,
} from "@/types/database";

export type ActivityWithUser = ActivityLog & {
  user: { name: string } | null;
};

function formatMeta(action: string, meta: Json): string {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return "";

  const m = meta as Record<string, Json>;

  switch (action) {
    case "ticket_created":
      return typeof m.title === "string" ? `"${m.title}"` : "";
    case "status_changed": {
      const from = m.from as TicketStatus | undefined;
      const to = m.to as TicketStatus | undefined;
      if (from && to) {
        return `${STATUS_LABELS[from]} → ${STATUS_LABELS[to]}`;
      }
      return "";
    }
    case "priority_changed": {
      const from = m.from as TicketPriority | undefined;
      const to = m.to as TicketPriority | undefined;
      if (from && to) {
        return `${PRIORITY_LABELS[from]} → ${PRIORITY_LABELS[to]}`;
      }
      return "";
    }
    case "assignee_changed":
      return "Assignee updated";
    case "start_date_changed": {
      const from = m.from as string | null | undefined;
      const to = m.to as string | null | undefined;
      return `${formatTicketDate(from ?? null)} → ${formatTicketDate(to ?? null)}`;
    }
    case "due_date_changed": {
      const from = m.from as string | null | undefined;
      const to = m.to as string | null | undefined;
      return `${formatTicketDate(from ?? null)} → ${formatTicketDate(to ?? null)}`;
    }
    case "comment_added":
      return "Added a comment";
    default:
      return "";
  }
}

const ACTION_LABELS: Record<string, string> = {
  ticket_created: "created this ticket",
  comment_added: "commented",
  status_changed: "changed status",
  assignee_changed: "changed assignee",
  priority_changed: "changed priority",
  start_date_changed: "changed start date",
  due_date_changed: "changed due date",
};

export function TicketActivity({
  activities,
}: {
  activities: ActivityWithUser[];
}) {
  if (activities.length === 0) {
    return (
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Activity</h2>
        <p className="text-muted-foreground text-sm">No activity yet.</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Activity</h2>
      <ul className="border-border space-y-3 border-l pl-4">
        {activities.map((item) => {
          const detail = formatMeta(item.action, item.meta);
          const label =
            ACTION_LABELS[item.action] ?? item.action.replace(/_/g, " ");

          return (
            <li key={item.id} className="text-sm">
              <span className="font-medium">{item.user?.name ?? "System"}</span>{" "}
              <span className="text-muted-foreground">{label}</span>
              {detail ? (
                <span className="text-muted-foreground"> · {detail}</span>
              ) : null}
              <span className="text-muted-foreground ml-2 text-xs">
                {formatDistanceToNow(new Date(item.created_at), {
                  addSuffix: true,
                })}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
