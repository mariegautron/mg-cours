"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { failure, NOT_FOUND } from "@/lib/messages";
import { PREP_STATUSES } from "@/lib/modules/schema";
import { cleanDeliverable } from "@/lib/modules/session-builder";
import { createClient } from "@/lib/supabase/server";

export interface WorkspaceState {
  error?: string;
  savedAt?: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Enregistrement automatique de la séance ouverte : titre, statut de préparation, ordre du déroulé
 * et livrable. Le plan (ordre, livrable) est ignoré sans la table `course_plan`.
 */
export async function saveWorkspace(
  moduleId: string,
  courseId: string,
  input: { title: string; prepStatus: string; deliverable: string; resourceOrder: string[] },
): Promise<WorkspaceState> {
  const title = input.title.replace(/\s+/g, " ").trim();
  if (!title) return { error: "Le titre de la séance ne peut pas être vide." };
  if (title.length > 200) return { error: "Titre : 200 caractères au plus." };
  if (!(PREP_STATUSES as readonly string[]).includes(input.prepStatus)) {
    return { error: "Statut inconnu." };
  }
  const deliverable = cleanDeliverable(input.deliverable);
  if (!deliverable.ok) return { error: deliverable.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course")
    .update({ title, prep_status: input.prepStatus })
    .eq("id", courseId)
    .eq("module_id", moduleId)
    .select("id")
    .maybeSingle();
  if (error) return { error: failure("enregistrer la séance") };
  if (!data) return { error: NOT_FOUND.course };

  // Plan : tolérant (table absente → seul le titre et le statut sont gardés).
  await supabase.from("course_plan").upsert(
    {
      course_id: courseId,
      deliverable: deliverable.text,
      resource_order: input.resourceOrder.filter((id) => UUID.test(id)),
    },
    { onConflict: "course_id" },
  );

  revalidatePath(`/modules/${moduleId}`, "layout");
  return { savedAt: new Date().toISOString() };
}

/** Retire une ressource du déroulé de la séance (la ressource elle-même n'est pas supprimée). */
export async function removeCourseResource(
  moduleId: string,
  courseId: string,
  resourceId: string,
): Promise<WorkspaceState> {
  const supabase = await createClient();
  const { data: course } = await supabase
    .from("course")
    .select("id")
    .eq("id", courseId)
    .eq("module_id", moduleId)
    .maybeSingle();
  if (!course) return { error: NOT_FOUND.course };
  const { error } = await supabase
    .from("course_resource")
    .delete()
    .eq("course_id", courseId)
    .eq("resource_id", resourceId);
  if (error) return { error: failure("retirer la ressource") };
  revalidatePath(`/modules/${moduleId}`, "layout");
  return { savedAt: new Date().toISOString() };
}

/** Supprime la séance puis revient à la liste des séances. */
export async function deleteCourseAndBack(moduleId: string, courseId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("course").delete().eq("id", courseId).eq("module_id", moduleId);
  revalidatePath(`/modules/${moduleId}`, "layout");
  redirect(`/modules/${moduleId}/courses`);
}
