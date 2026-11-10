"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { moveInOrder, nextPosition, renumber, type MoveDirection } from "@/lib/modules/reorder";
import { readCourseForm } from "@/lib/modules/schema";
import { createClient } from "@/lib/supabase/server";
import { failure, NOT_FOUND } from "@/lib/messages";

export interface CourseFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

function flatten(fieldErrors: Record<string, string[] | undefined>): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(fieldErrors).filter(([, v]) => v && v.length) as [string, string[]][],
  );
}

async function syncResources(
  supabase: Awaited<ReturnType<typeof createClient>>,
  courseId: string,
  resourceIds: string[],
) {
  // Synchronisation différentielle : les ressources déjà liées gardent leur ligne (ordre du
  // déroulé, type, durée et objectif de l'activité) ; seules les retirées et les ajoutées changent.
  const { data: current } = await supabase
    .from("course_resource")
    .select("resource_id, role")
    .eq("course_id", courseId);
  const existing = new Map((current ?? []).map((r) => [r.resource_id, r.role]));
  const wanted = new Set(resourceIds);

  const removed = [...existing.keys()].filter((id) => !wanted.has(id));
  if (removed.length) {
    await supabase
      .from("course_resource")
      .delete()
      .eq("course_id", courseId)
      .in("resource_id", removed);
  }
  const added = resourceIds.filter((id) => !existing.has(id));
  if (added.length) {
    await supabase.from("course_resource").insert(
      added.map((resourceId) => ({
        course_id: courseId,
        resource_id: resourceId,
        role: resourceIds[0] === resourceId ? ("primary" as const) : ("secondary" as const),
      })),
    );
  }
  for (const [i, resourceId] of resourceIds.entries()) {
    const role = i === 0 ? ("primary" as const) : ("secondary" as const);
    if (existing.has(resourceId) && existing.get(resourceId) !== role) {
      await supabase
        .from("course_resource")
        .update({ role })
        .eq("course_id", courseId)
        .eq("resource_id", resourceId);
    }
  }
}

export async function createCourse(
  moduleId: string,
  _prev: CourseFormState,
  formData: FormData,
): Promise<CourseFormState> {
  const parsed = readCourseForm(formData);
  if (!parsed.success) return { fieldErrors: flatten(parsed.error.flatten().fieldErrors) };

  const supabase = await createClient();
  // Une nouvelle séance arrive en dernier ; on la déplace ensuite avec monter / descendre (US-61).
  const { data: existing } = await supabase
    .from("course")
    .select("position")
    .eq("module_id", moduleId);
  const { data, error } = await supabase
    .from("course")
    .insert({
      module_id: moduleId,
      title: parsed.data.title,
      type: parsed.data.type,
      position: nextPosition((existing ?? []).map((c) => c.position)),
      session_date: parsed.data.sessionDate,
      start_time: parsed.data.startTime,
      end_time: parsed.data.endTime,
      prep_status: parsed.data.prepStatus,
      learning_objectives: parsed.data.learningObjectives,
      animation_notes: parsed.data.animationNotes || null,
      assessment_notes: parsed.data.assessmentNotes || null,
      material: parsed.data.material || null,
    })
    .select("id")
    .single();

  if (error || !data) return { error: failure("enregistrer", { kept: true }) };

  await syncResources(supabase, data.id, parsed.data.resourceIds);

  revalidatePath(`/modules/${moduleId}`, "layout");
  redirect(`/modules/${moduleId}/courses/${data.id}`);
}

export async function updateCourse(
  moduleId: string,
  courseId: string,
  _prev: CourseFormState,
  formData: FormData,
): Promise<CourseFormState> {
  const parsed = readCourseForm(formData);
  if (!parsed.success) return { fieldErrors: flatten(parsed.error.flatten().fieldErrors) };

  const supabase = await createClient();
  const { error } = await supabase
    .from("course")
    .update({
      title: parsed.data.title,
      type: parsed.data.type,
      session_date: parsed.data.sessionDate,
      start_time: parsed.data.startTime,
      end_time: parsed.data.endTime,
      prep_status: parsed.data.prepStatus,
      learning_objectives: parsed.data.learningObjectives,
      animation_notes: parsed.data.animationNotes || null,
      assessment_notes: parsed.data.assessmentNotes || null,
      material: parsed.data.material || null,
      // Champ critique pour la trame : toute édition vaut mise à jour du contenu.
      content_last_updated_at: new Date().toISOString(),
    })
    .eq("id", courseId);

  if (error) return { error: failure("enregistrer", { kept: true }) };

  await syncResources(supabase, courseId, parsed.data.resourceIds);

  revalidatePath(`/modules/${moduleId}`, "layout");
  redirect(`/modules/${moduleId}/courses/${courseId}?saved=1`);
}

export async function deleteCourse(moduleId: string, courseId: string) {
  "use server";
  const supabase = await createClient();
  await supabase.from("course").delete().eq("id", courseId);
  revalidatePath(`/modules/${moduleId}`);
}

export interface MoveCourseResult {
  error?: string;
  /** Rang (à partir de 1) et nombre de séances après le déplacement. */
  position?: number;
  total?: number;
}

/** US-61 : monte ou descend une séance d'un rang ; les positions sont renumérotées de 1 à N. */
export async function moveCourse(
  moduleId: string,
  courseId: string,
  direction: MoveDirection,
): Promise<MoveCourseResult> {
  if (direction !== "up" && direction !== "down") return { error: "Déplacement inconnu." };

  const supabase = await createClient();
  const { data } = await supabase
    .from("course")
    .select("id")
    .eq("module_id", moduleId)
    .order("position")
    .order("created_at");
  const ids = (data ?? []).map((c) => c.id);
  if (!ids.includes(courseId)) return { error: NOT_FOUND.course };

  const reordered = moveInOrder(ids, courseId, direction);
  const results = await Promise.all(
    renumber(reordered).map(({ id, position }) =>
      supabase.from("course").update({ position }).eq("id", id).eq("module_id", moduleId),
    ),
  );
  if (results.some((r) => r.error)) return { error: failure("déplacer la séance") };

  revalidatePath(`/modules/${moduleId}`);
  return { position: reordered.indexOf(courseId) + 1, total: ids.length };
}

/**
 * « Attendus traités » d'une séance : remplace la liste des attendus du module reliés à cette
 * séance (seuls les attendus du module sont acceptés). Sert à la couverture et au PDF.
 */
export async function setCourseExpectations(
  moduleId: string,
  courseId: string,
  expectationIds: string[],
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const [{ data: course }, { data: expectations }] = await Promise.all([
    supabase.from("course").select("id").eq("id", courseId).eq("module_id", moduleId).maybeSingle(),
    supabase.from("module_expectation").select("id").eq("module_id", moduleId),
  ]);
  if (!course) return { error: NOT_FOUND.course };
  const allowed = new Set((expectations ?? []).map((e) => e.id));
  const wanted = [...new Set(expectationIds)].filter((id) => allowed.has(id));
  const { error: delError } = await supabase
    .from("course_expectation")
    .delete()
    .eq("course_id", courseId);
  if (delError) return { error: failure("enregistrer") };
  if (wanted.length) {
    const { error } = await supabase
      .from("course_expectation")
      .insert(wanted.map((expectation_id) => ({ course_id: courseId, expectation_id })));
    if (error) return { error: failure("enregistrer") };
  }
  revalidatePath(`/modules/${moduleId}/courses/${courseId}`);
  revalidatePath(`/modules/${moduleId}/expectations`);
  revalidatePath(`/modules/${moduleId}/outline`);
  revalidatePath(`/modules/${moduleId}`);
  return {};
}

/** Couverture : « Traité en séance… » relie un attendu à une séance (sans retirer les autres). */
export async function linkExpectationToCourse(
  moduleId: string,
  expectationId: string,
  courseId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const [{ data: course }, { data: expectation }] = await Promise.all([
    supabase.from("course").select("id").eq("id", courseId).eq("module_id", moduleId).maybeSingle(),
    supabase
      .from("module_expectation")
      .select("id")
      .eq("id", expectationId)
      .eq("module_id", moduleId)
      .maybeSingle(),
  ]);
  if (!course || !expectation) return { error: NOT_FOUND.course };
  const { data: existing } = await supabase
    .from("course_expectation")
    .select("course_id")
    .eq("course_id", courseId)
    .eq("expectation_id", expectationId)
    .maybeSingle();
  if (!existing) {
    const { error } = await supabase
      .from("course_expectation")
      .insert({ course_id: courseId, expectation_id: expectationId });
    if (error) return { error: failure("enregistrer") };
  }
  revalidatePath(`/modules/${moduleId}/expectations`);
  revalidatePath(`/modules/${moduleId}/courses/${courseId}`);
  revalidatePath(`/modules/${moduleId}/outline`);
  return {};
}
