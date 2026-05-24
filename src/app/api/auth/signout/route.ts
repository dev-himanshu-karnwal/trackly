import { getAppUrl } from "@/lib/app-url";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  await supabase.auth.signOut();

  const appUrl = getAppUrl();
  return NextResponse.redirect(new URL("/login", appUrl));
}
