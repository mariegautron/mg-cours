"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { moveInOrder, nextPosition, renumber, type MoveDirection } from "@/lib/modules/reorder";
import { readCourseForm } from "@/lib/modules/schema";
import { createClient } from "@/lib/supabase/server";

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
  await supabase.from("course_resource").delete().eq("course_id", courseId);
  if (resourceIds.length === 0) return;
  await supabase.from("course_resource").insert(
    resourceIds.map((resourceId, i) => ({
      course_id: courseId,
      resource_id: resourceId,
      role: i === 0 ? ("primary" as const) : ("secondary" as const),
    })),
  );
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

  if (error || !data) return { error: "Enregistrement impossible. Réessayez." };

  await syncResources(supabase, data.id, parsed.data.resourceIds);

  revalidatePath(`/modules/${moduleId}`);
  redirect(`/modules/${moduleId}#courses`);
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

  if (error) return { error: "Enregistrement impossible. Réessayez." };

  await syncResources(supabase, courseId, parsed.data.resourceIds);

  revalidatePath(`/modules/${moduleId}`);
  redirect(`/modules/${moduleId}#courses`);
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
  if (!ids.includes(courseId)) return { error: "Séance introuvable." };

  const reordered = moveInOrder(ids, courseId, direction);
  const results = await Promise.all(
    renumber(reordered).map(({ id, position }) =>
      supabase.from("course").update({ position }).eq("id", id).eq("module_id", moduleId),
    ),
  );
  if (results.some((r) => r.error)) return { error: "Déplacement impossible. Réessayez." };

  revalidatePath(`/modules/${moduleId}`);
  return { position: reordered.indexOf(courseId) + 1, total: ids.length };
}
