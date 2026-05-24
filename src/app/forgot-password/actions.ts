"use server";

import { getPasswordResetRedirectUrl } from "@/lib/app-url";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export async function requestPasswordReset(email: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getPasswordResetRedirectUrl(),
  });

  if (error) {
    return { error: error.message };
  }

  return { ok: true as const };
}
