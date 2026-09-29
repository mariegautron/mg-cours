"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { readGroupForm } from "@/lib/students/schema";
import { createClient } from "@/lib/supabase/server";
import { failure, NOT_FOUND } from "@/lib/messages";

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
          : failure("enregistrer"),
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

/** US-77 : ajout en masse ; les étudiant·es déjà membres sont ignoré·es. */
export async function addMembers(
  moduleId: string,
  groupId: string,
  studentIds: string[],
): Promise<{ error?: string; added?: number }> {
  "use server";
  const ids = [...new Set(studentIds)].slice(0, 500);
  if (ids.length === 0) return { error: "Sélectionne au moins un·e étudiant·e." };

  const supabase = await createClient();
  // Le groupe doit appartenir au module et à l'utilisatrice connectée (la RLS filtre le reste).
  const { data: group } = await supabase
    .from("student_group")
    .select("id")
    .eq("id", groupId)
    .eq("module_id", moduleId)
    .maybeSingle();
  if (!group) return { error: NOT_FOUND.group };

  const { error } = await supabase.from("group_member").upsert(
    ids.map((student_id) => ({ student_group_id: groupId, student_id })),
    { onConflict: "student_group_id,student_id", ignoreDuplicates: true },
  );
  if (error) return { error: failure("ajouter les membres") };

  revalidatePath(`/modules/${moduleId}/groups/${groupId}`);
  revalidatePath(`/modules/${moduleId}`);
  return { added: ids.length };
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
