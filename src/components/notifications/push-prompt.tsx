"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PROMPT_KEY = "trackly-push-prompted";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

async function subscribeAndRegister(): Promise<boolean> {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) {
    console.warn("[push-prompt] NEXT_PUBLIC_VAPID_PUBLIC_KEY not set");
    return false;
  }

  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return false;
  }

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
  });

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return false;
  }

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    }),
  });

  return res.ok;
}

interface PushPromptProps {
  /** When false, the prompt will not appear (e.g. user disabled push in settings). */
  pushEnabled?: boolean;
}

export function PushPrompt({ pushEnabled = true }: PushPromptProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current || !pushEnabled) return;
    checked.current = true;

    if (typeof window === "undefined") return;
    if (localStorage.getItem(PROMPT_KEY)) return;
    if (!("Notification" in window) || Notification.permission === "granted") {
      localStorage.setItem(PROMPT_KEY, "1");
      return;
    }
    if (Notification.permission === "denied") {
      localStorage.setItem(PROMPT_KEY, "1");
      return;
    }

    const timer = window.setTimeout(() => setOpen(true), 800);
    return () => window.clearTimeout(timer);
  }, [pushEnabled]);

  async function handleEnable() {
    setLoading(true);
    try {
      const ok = await subscribeAndRegister();
      localStorage.setItem(PROMPT_KEY, "1");
      setOpen(false);
      if (ok) {
        toast.success("Browser notifications enabled");
      } else {
        toast.error("Could not enable notifications");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleDismiss() {
    localStorage.setItem(PROMPT_KEY, "1");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="size-5" />
            Enable notifications?
          </DialogTitle>
          <DialogDescription>
            Get browser alerts when tickets are assigned to you, statuses
            change, or someone comments. You can turn this off anytime in
            Settings.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleDismiss} disabled={loading}>
            Not now
          </Button>
          <Button onClick={handleEnable} disabled={loading}>
            {loading ? "Enabling…" : "Enable notifications"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
