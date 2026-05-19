"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updatePassword, updatePushEnabled } from "@/app/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { Profile } from "@/types/database";

interface SettingsFormProps {
  profile: Profile;
}

export function SettingsForm({ profile }: SettingsFormProps) {
  const [pushEnabled, setPushEnabled] = useState(profile.push_enabled);
  const [isPending, startTransition] = useTransition();
  const [passwordPending, setPasswordPending] = useState(false);

  function handlePushToggle(checked: boolean) {
    setPushEnabled(checked);
    startTransition(async () => {
      const result = await updatePushEnabled(checked);
      if (result.error) {
        setPushEnabled(!checked);
        toast.error(result.error);
      } else {
        toast.success(
          checked ? "Push notifications enabled" : "Push notifications disabled"
        );
      }
    });
  }

  async function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPasswordPending(true);
    const formData = new FormData(e.currentTarget);
    const result = await updatePassword(formData);
    setPasswordPending(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Password updated");
    e.currentTarget.reset();
  }

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-medium">Account</h2>
          <p className="text-muted-foreground text-sm">{profile.email}</p>
        </div>

        <form onSubmit={handlePasswordSubmit} className="max-w-md space-y-4">
          <h3 className="text-sm font-medium">Change password</h3>
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>
          <Button type="submit" disabled={passwordPending}>
            {passwordPending ? "Updating…" : "Update password"}
          </Button>
        </form>
      </section>

      <section className="border-border space-y-4 border-t pt-8">
        <h2 className="text-lg font-medium">Notifications</h2>
        <p className="text-muted-foreground text-sm">
          Ticket updates are sent by email when SMTP is configured. Browser push
          requires enabling below and allowing notifications in your browser.
        </p>
        <div className="border-border flex max-w-md items-center justify-between gap-4 rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="push-enabled" className="text-base">
              Browser push notifications
            </Label>
            <p className="text-muted-foreground text-sm">
              Alerts for assignments, status changes, and comments
            </p>
          </div>
          <Switch
            id="push-enabled"
            checked={pushEnabled}
            onCheckedChange={handlePushToggle}
            disabled={isPending}
          />
        </div>
      </section>
    </div>
  );
}
