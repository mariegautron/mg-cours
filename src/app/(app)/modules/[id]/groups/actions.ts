"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { readGroupForm } from "@/lib/students/schema";
import { createClient } from "@/lib/supabase/server";

export interface GroupFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

function flatten(fieldErrors: Record<string, string[] | undefined>): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(fieldErrors).filter(([, v]) => v && v.length) as [string, string[]][],
  );
}

export async function createGroup(
  moduleId: string,
  _prev: GroupFormState,
  formData: FormData,
): Promise<GroupFormState> {
  const parsed = readGroupForm(formData);
  if (!parsed.success) return { fieldErrors: flatten(parsed.error.flatten().fieldErrors) };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_group")
    .insert({ module_id: moduleId, name: parsed.data.name, type: parsed.data.type })
    .select("id")
    .single();

  if (error || !data) {
    return {
      error:
        error?.code === "23505"
          ? "Un groupe porte déjà ce nom dans ce module."
          : "Enregistrement impossible.",
    };
  }

  revalidatePath(`/modules/${moduleId}`);
  redirect(`/modules/${moduleId}/groups/${data.id}`);
}

export async function deleteGroup(moduleId: string, groupId: string) {
  "use server";
  const supabase = await createClient();
  await supabase.from("student_group").delete().eq("id", groupId);
  revalidatePath(`/modules/${moduleId}`);
  redirect(`/modules/${moduleId}`);
}

export async function addMember(moduleId: string, groupId: string, studentId: string) {
  "use server";
  const supabase = await createClient();
  await supabase.from("group_member").insert({ student_group_id: groupId, student_id: studentId });
  revalidatePath(`/modules/${moduleId}/groups/${groupId}`);
}

export async function removeMember(moduleId: string, groupId: string, studentId: string) {
  "use server";
  const supabase = await createClient();
  await supabase
    .from("group_member")
    .delete()
    .eq("student_group_id", groupId)
    .eq("student_id", studentId);
  revalidatePath(`/modules/${moduleId}/groups/${groupId}`);
}
