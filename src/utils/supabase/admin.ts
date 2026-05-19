import { createClient } from "@supabase/supabase-js";

const ADMIN_KEY_ENV_NAMES = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SECRET_KEY",
] as const;

function decodeJwtPayload(key: string): { role?: string } | null {
  const parts = key.split(".");
  if (parts.length !== 3) return null;
  try {
    const json = Buffer.from(parts[1], "base64url").toString("utf8");
    return JSON.parse(json) as { role?: string };
  } catch {
    return null;
  }
}

/**
 * Resolves the Supabase secret / service_role key used for Auth Admin and RLS bypass.
 */
export function getSupabaseAdminKey(): string {
  for (const name of ADMIN_KEY_ENV_NAMES) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }

  throw new Error(
    `Missing admin Supabase key. Set ${ADMIN_KEY_ENV_NAMES.join(" or ")} in .env.local (Dashboard → Settings → API Keys → secret key or legacy service_role).`
  );
}

function assertAdminKeyIsValid(key: string): void {
  const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (publishable && key === publishable) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY must be the secret/service_role key, not NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  }

  if (key.startsWith("sb_publishable_")) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is a publishable key. Use the secret key (sb_secret_…) or legacy service_role JWT instead."
    );
  }

  const payload = decodeJwtPayload(key);
  if (payload?.role === "anon") {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is the anon JWT. Use the service_role JWT or sb_secret_… key instead."
    );
  }
}

/**
 * Maps Supabase Auth admin API errors to actionable setup guidance.
 */
export function formatAuthAdminError(message: string): string {
  if (message === "User not allowed") {
    return [
      "Could not create user: Supabase rejected the admin request.",
      "Set SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) in .env.local to the secret key from Dashboard → Settings → API Keys — not the publishable/anon key.",
      "Restart the dev server after changing env vars.",
    ].join(" ");
  }
  return message;
}

/**
 * Service-role Supabase client — server-only. Bypasses RLS.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const adminKey = getSupabaseAdminKey();

  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }

  assertAdminKeyIsValid(adminKey);

  return createClient(url, adminKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
