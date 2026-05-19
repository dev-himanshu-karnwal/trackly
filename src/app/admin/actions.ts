"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { dispatchNotification } from "@/lib/notifications/notify";
import { generatePassword } from "@/lib/utils";
import type { ProfileUpdate, UserRole } from "@/types/database";
import {
  createAdminClient,
  formatAuthAdminError,
} from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

const roleSchema = z.enum(["admin", "qa", "engineer"]);

export type ActionResult =
  | { success: true; message?: string }
  | { success: false; error: string };

async function getSupabase() {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}

const createUserSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.email("Enter a valid email address"),
    role: roleSchema,
    autoGeneratePassword: z.boolean(),
    password: z.string().optional(),
  })
  .refine(
    (data) =>
      data.autoGeneratePassword ||
      (data.password !== undefined && data.password.length >= 6),
    { message: "Password must be at least 6 characters", path: ["password"] }
  );

const updateUserSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1, "Name is required"),
  email: z.email("Enter a valid email address"),
  role: roleSchema,
  is_active: z.boolean(),
});

const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers, and hyphens"
    ),
  description: z.string().optional(),
  memberIds: z.array(z.uuid()).default([]),
});

const updateProjectSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1, "Name is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers, and hyphens"
    ),
  description: z.string().optional(),
  is_archived: z.boolean(),
  memberIds: z.array(z.uuid()).default([]),
});

export async function createUser(
  input: z.infer<typeof createUserSchema>
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { name, email, role, autoGeneratePassword, password } = parsed.data;
  const finalPassword = autoGeneratePassword ? generatePassword() : password!;

  try {
    const admin = createAdminClient();
    const { data: authData, error: authError } =
      await admin.auth.admin.createUser({
        email,
        password: finalPassword,
        email_confirm: true,
        user_metadata: { name },
      });

    if (authError) {
      return { success: false, error: formatAuthAdminError(authError.message) };
    }

    if (!authData.user) {
      return { success: false, error: "User was not created" };
    }

    const profileUpdate: ProfileUpdate = { name, role };
    const { error: profileError } = await admin
      .from("profiles")
      .update(profileUpdate)
      .eq("id", authData.user.id);

    if (profileError) {
      return { success: false, error: profileError.message };
    }

    void dispatchNotification({
      type: "USER_WELCOME",
      user: { id: authData.user.id, name, email },
    });

    revalidatePath("/admin/users");
    redirect("/admin/users");
  } catch (err) {
    if (isRedirectError(err)) throw err;
    const message =
      err instanceof Error ? err.message : "Failed to create user";
    return { success: false, error: message };
  }
}

export async function updateUser(
  input: z.infer<typeof updateUserSchema>
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = updateUserSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { id, name, email, role, is_active } = parsed.data;

  try {
    const supabase = await getSupabase();
    const admin = createAdminClient();

    const { data: existing } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", id)
      .single();

    if (!existing) {
      return { success: false, error: "User not found" };
    }

    if (existing.email !== email) {
      const { error: authError } = await admin.auth.admin.updateUserById(id, {
        email,
      });
      if (authError) {
        return {
          success: false,
          error: formatAuthAdminError(authError.message),
        };
      }
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ name, email, role, is_active })
      .eq("id", id);

    if (profileError) {
      return { success: false, error: profileError.message };
    }

    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${id}/edit`);
    return { success: true, message: "User updated" };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update user";
    return { success: false, error: message };
  }
}

export async function createProject(
  input: z.infer<typeof createProjectSchema>
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = createProjectSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { name, slug, description, memberIds } = parsed.data;

  try {
    const supabase = await getSupabase();

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({
        name,
        slug,
        description: description?.trim() || null,
      })
      .select("id")
      .single();

    if (projectError) {
      return { success: false, error: projectError.message };
    }

    if (memberIds.length > 0) {
      const { error: membersError } = await supabase
        .from("project_members")
        .insert(
          memberIds.map((user_id) => ({
            project_id: project.id,
            user_id,
          }))
        );
      if (membersError) {
        return { success: false, error: membersError.message };
      }
    }

    revalidatePath("/admin/projects");
    revalidatePath("/projects");
    redirect("/admin/projects");
  } catch (err) {
    if (isRedirectError(err)) throw err;
    const message =
      err instanceof Error ? err.message : "Failed to create project";
    return { success: false, error: message };
  }
}

function isRedirectError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    String((err as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

export async function updateProject(
  input: z.infer<typeof updateProjectSchema>
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = updateProjectSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { id, name, slug, description, is_archived, memberIds } = parsed.data;

  try {
    const supabase = await getSupabase();

    const { error: projectError } = await supabase
      .from("projects")
      .update({
        name,
        slug,
        description: description?.trim() || null,
        is_archived,
      })
      .eq("id", id);

    if (projectError) {
      return { success: false, error: projectError.message };
    }

    const { data: currentMembers, error: fetchError } = await supabase
      .from("project_members")
      .select("user_id")
      .eq("project_id", id);

    if (fetchError) {
      return { success: false, error: fetchError.message };
    }

    const currentIds = new Set((currentMembers ?? []).map((m) => m.user_id));
    const newIds = new Set(memberIds);

    const toRemove = [...currentIds].filter((uid) => !newIds.has(uid));
    const toAdd = [...newIds].filter((uid) => !currentIds.has(uid));

    if (toRemove.length > 0) {
      const { error: removeError } = await supabase
        .from("project_members")
        .delete()
        .eq("project_id", id)
        .in("user_id", toRemove);
      if (removeError) {
        return { success: false, error: removeError.message };
      }
    }

    if (toAdd.length > 0) {
      const { error: addError } = await supabase
        .from("project_members")
        .insert(toAdd.map((user_id) => ({ project_id: id, user_id })));
      if (addError) {
        return { success: false, error: addError.message };
      }
    }

    revalidatePath("/admin/projects");
    revalidatePath(`/admin/projects/${id}/edit`);
    revalidatePath("/projects");
    return { success: true, message: "Project updated" };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update project";
    return { success: false, error: message };
  }
}
