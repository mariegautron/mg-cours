"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { failure, NOT_FOUND } from "@/lib/messages";
import { cleanActivity, type Activity } from "@/lib/modules/activity";
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
  input: {
    title: string;
    prepStatus: string;
    deliverable: string;
    resourceOrder: string[];
    /** Détails par activité (id de ressource → activité) ; absent = rien à enregistrer. */
    activities?: Record<string, Partial<Record<keyof Activity, unknown>>>;
  },
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

  // Activités du déroulé : tolérant (colonnes absentes → ignoré, le déroulé reste simple).
  for (const [resourceId, raw] of Object.entries(input.activities ?? {})) {
    if (!UUID.test(resourceId)) continue;
    const a = cleanActivity(raw);
    await supabase
      .from("course_resource")
      .update({
        duration_minutes: a.durationMinutes,
        activity_type: a.type,
        start_time: a.startTime,
        pedagogical_objective: a.objective,
        prep_state: a.prepState,
      })
      .eq("course_id", courseId)
      .eq("resource_id", resourceId);
  }

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

/**
 * Ajoute une ressource au déroulé de la séance, en dernière position. La ressource devient aussi
 * « retenue » pour le module (sans doublon) : elle reste proposée dans les autres séances.
 */
export async function addCourseResource(
  moduleId: string,
  courseId: string,
  resourceId: string,
): Promise<WorkspaceState> {
  if (!UUID.test(resourceId)) return { error: failure("ajouter la ressource") };
  const supabase = await createClient();
  const [{ data: course }, { data: resource }] = await Promise.all([
    supabase.from("course").select("id").eq("id", courseId).eq("module_id", moduleId).maybeSingle(),
    supabase.from("resource").select("id").eq("id", resourceId).maybeSingle(),
  ]);
  if (!course) return { error: NOT_FOUND.course };
  if (!resource) return { error: NOT_FOUND.resource };

  const { error } = await supabase
    .from("course_resource")
    .upsert(
      { course_id: courseId, resource_id: resourceId },
      { onConflict: "course_id,resource_id", ignoreDuplicates: true },
    );
  if (error) return { error: failure("ajouter la ressource") };

  await supabase
    .from("module_resource")
    .upsert(
      { module_id: moduleId, resource_id: resourceId },
      { onConflict: "module_id,resource_id", ignoreDuplicates: true },
    );

  // Plan : la ressource prend la dernière place (tolérant sans la table `course_plan`).
  const { data: plan } = await supabase
    .from("course_plan")
    .select("deliverable, resource_order")
    .eq("course_id", courseId)
    .maybeSingle();
  if (plan) {
    const order = (plan.resource_order ?? []).filter((id: string) => id !== resourceId);
    await supabase
      .from("course_plan")
      .update({ resource_order: [...order, resourceId] })
      .eq("course_id", courseId);
  }
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
