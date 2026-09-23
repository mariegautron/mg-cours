"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
  const { data, error } = await supabase
    .from("course")
    .insert({
      module_id: moduleId,
      title: parsed.data.title,
      type: parsed.data.type,
      position: parsed.data.position,
      session_date: parsed.data.sessionDate,
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
  redirect(`/modules/${moduleId}`);
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
      position: parsed.data.position,
      session_date: parsed.data.sessionDate,
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
  redirect(`/modules/${moduleId}`);
}

export async function deleteCourse(moduleId: string, courseId: string) {
  "use server";
  const supabase = await createClient();
  await supabase.from("course").delete().eq("id", courseId);
  revalidatePath(`/modules/${moduleId}`);
}
