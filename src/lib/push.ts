import webpush from "web-push";

import { createAdminClient } from "@/utils/supabase/admin";

let vapidConfigured = false;

function configureVapid(): boolean {
  if (vapidConfigured) return true;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject =
    process.env.VAPID_SUBJECT ?? "mailto:notifications@trackly.local";

  if (!publicKey || !privateKey) {
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

export function isPushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
  );
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
}

export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<void> {
  if (!configureVapid()) {
    console.warn(
      "[push] VAPID keys not configured — push notifications will be skipped."
    );
    return;
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    console.warn("[push] Admin client unavailable — skipping push.");
    return;
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (!profile?.push_enabled) return;

  const { data: subscriptions } = await admin
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId);

  if (!subscriptions?.length) return;

  const notification = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url,
    tag: payload.tag,
  });

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth_key,
            },
          },
          notification
        );
      } catch (err: unknown) {
        const statusCode =
          err && typeof err === "object" && "statusCode" in err
            ? (err as { statusCode: number }).statusCode
            : null;
        if (statusCode === 404 || statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error("[push] Failed to send to subscription:", err);
        }
      }
    })
  );
}
