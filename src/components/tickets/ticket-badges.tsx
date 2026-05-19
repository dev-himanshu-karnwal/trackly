import { Badge } from "@/components/ui/badge";
import { PRIORITY_LABELS, STATUS_LABELS, TYPE_LABELS } from "@/lib/constants";
import { priorityBadgeClass, statusBadgeClass } from "@/lib/tickets";
import type {
  TicketPriority,
  TicketStatus,
  TicketType,
} from "@/types/database";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn("border-0 font-medium", statusBadgeClass(status))}
    >
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return (
    <Badge
      variant="outline"
      className={cn("border-0 font-medium", priorityBadgeClass(priority))}
    >
      {PRIORITY_LABELS[priority]}
    </Badge>
  );
}

export function TypeBadge({ type }: { type: TicketType }) {
  return (
    <Badge variant="secondary" className="font-medium capitalize">
      {TYPE_LABELS[type]}
    </Badge>
  );
}
