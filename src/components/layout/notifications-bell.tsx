"use client";

import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function NotificationsBell() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground"
          aria-label="Notifications"
        >
          <Bell className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <p className="text-sm font-medium">Notifications</p>
        <p className="text-muted-foreground mt-2 text-sm">
          Ticket updates are delivered via email and browser push. In-app
          notification history is coming soon.
        </p>
        <p className="text-muted-foreground mt-3 text-xs">
          Configure push in Settings.
        </p>
      </PopoverContent>
    </Popover>
  );
}
