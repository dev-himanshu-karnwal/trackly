import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const endpoint =
    body &&
    typeof body === "object" &&
    "endpoint" in body &&
    typeof body.endpoint === "string"
      ? body.endpoint
      : null;

  const keys =
    body &&
    typeof body === "object" &&
    "keys" in body &&
    body.keys &&
    typeof body.keys === "object"
      ? body.keys
      : null;

  const p256dh =
    keys && "p256dh" in keys && typeof keys.p256dh === "string"
      ? keys.p256dh
      : null;
  const auth =
    keys && "auth" in keys && typeof keys.auth === "string" ? keys.auth : null;

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json(
      { error: "endpoint and keys.p256dh, keys.auth are required" },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh,
      auth_key: auth,
    },
    { onConflict: "user_id,endpoint" }
  );

  if (error) {
    console.error("[push/subscribe]", error);
    return NextResponse.json(
      { error: "Failed to save subscription" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
