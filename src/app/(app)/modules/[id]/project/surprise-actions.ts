"use server";

import { revalidatePath } from "next/cache";

import { failure, NOT_FOUND } from "@/lib/messages";
import { cleanSurprise } from "@/lib/projects/surprises";
import { createClient } from "@/lib/supabase/server";

export interface SurpriseState {
  error?: string;
  saved?: boolean;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function refresh(moduleId: string) {
  revalidatePath(`/modules/${moduleId}/project`);
  revalidatePath("/dashboard");
}

/** Vérifie que la séance (si fournie) appartient bien au module. */
async function courseOk(
  supabase: Awaited<ReturnType<typeof createClient>>,
  moduleId: string,
  courseId: string,
): Promise<boolean> {
  if (!courseId) return true;
  if (!UUID.test(courseId)) return false;
  const { data } = await supabase
    .from("course")
    .select("id")
    .eq("id", courseId)
    .eq("module_id", moduleId)
    .maybeSingle();
  return !!data;
}

export async function addSurprise(
  moduleId: string,
  _prev: SurpriseState,
  formData: FormData,
): Promise<SurpriseState> {
  const cleaned = cleanSurprise({
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
  });
  if (!cleaned.ok) return { error: cleaned.error };
  const courseId = String(formData.get("courseId") ?? "");
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("module_project")
    .select("id")
    .eq("module_id", moduleId)
    .maybeSingle();
  if (!project) return { error: NOT_FOUND.project };
  if (!(await courseOk(supabase, moduleId, courseId))) return { error: NOT_FOUND.course };
  const { error } = await supabase.from("project_surprise").insert({
    project_id: project.id,
    course_id: courseId || null,
    title: cleaned.title,
    body: cleaned.body,
  });
  if (error) {
    return {
      error:
        error.code === "42P01" || /project_surprise/.test(error.message)
          ? "Les imprévus seront disponibles après la mise à jour de la base de données."
          : failure("ajouter l’imprévu", { kept: true }),
    };
  }
  refresh(moduleId);
  return { saved: true };
}

export async function updateSurprise(
  moduleId: string,
  surpriseId: string,
  _prev: SurpriseState,
  formData: FormData,
): Promise<SurpriseState> {
  const cleaned = cleanSurprise({
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
  });
  if (!cleaned.ok) return { error: cleaned.error };
  const courseId = String(formData.get("courseId") ?? "");
  const supabase = await createClient();
  if (!(await courseOk(supabase, moduleId, courseId))) return { error: NOT_FOUND.course };
  const { data, error } = await supabase
    .from("project_surprise")
    .update({ title: cleaned.title, body: cleaned.body, course_id: courseId || null })
    .eq("id", surpriseId)
    .select("id");
  if (error) return { error: failure("enregistrer l’imprévu", { kept: true }) };
  if (!data?.length) return { error: "Cet imprévu n’existe plus." };
  refresh(moduleId);
  return { saved: true };
}

export async function setSurpriseSent(
  moduleId: string,
  surpriseId: string,
  sent: boolean,
): Promise<SurpriseState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("project_surprise")
    .update({ sent_at: sent ? new Date().toISOString() : null })
    .eq("id", surpriseId);
  if (error) return { error: failure("enregistrer l’imprévu") };
  refresh(moduleId);
  return { saved: true };
}

export async function deleteSurprise(moduleId: string, surpriseId: string): Promise<SurpriseState> {
  const supabase = await createClient();
  const { error } = await supabase.from("project_surprise").delete().eq("id", surpriseId);
  if (error) return { error: failure("supprimer l’imprévu") };
  refresh(moduleId);
  return { saved: true };
}
