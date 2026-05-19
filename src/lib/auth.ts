import { createClient } from "@/utils/supabase/server";
import type { Profile, UserRole } from "@/types/database";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type { Profile, UserRole };

export async function getSession() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getProfile() {
  const user = await getSession();
  if (!user) return null;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return data;
}

export async function requireAuth() {
  const user = await getSession();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") redirect("/projects");
  return profile;
}
