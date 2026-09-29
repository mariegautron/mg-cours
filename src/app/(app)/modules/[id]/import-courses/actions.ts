"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { planCourseImport } from "@/lib/modules/course-import";
import { createClient } from "@/lib/supabase/server";

export interface ImportCoursesState {
  error?: string;
}

/** US-58 : ajoute à la suite du module des copies des séances cochées d'un autre module. */
export async function importCourses(
  moduleId: string,
  sourceId: string,
  _prev: ImportCoursesState,
  formData: FormData,
): Promise<ImportCoursesState> {
  const courseIds = formData.getAll("courseIds").map(String);
  if (courseIds.length === 0) return { error: "Cochez au moins une séance à importer." };
  if (sourceId === moduleId) return { error: "Choisissez un autre module." };

  const supabase = await createClient();
  // Les deux modules doivent appartenir à l'utilisatrice connectée (la RLS ne renvoie rien sinon).
  const [{ data: target }, { data: source }] = await Promise.all([
    supabase.from("module").select("id").eq("id", moduleId).maybeSingle(),
    supabase.from("module").select("id").eq("id", sourceId).maybeSingle(),
  ]);
  if (!target || !source) return { error: "Module introuvable." };

  const [{ data: sourceCourses }, { data: existing }] = await Promise.all([
    supabase
      .from("course")
      .select(
        "id, title, type, position, learning_objectives, animation_notes, assessment_notes, material, course_resource(resource_id, role)",
      )
      .eq("module_id", sourceId),
    supabase.from("course").select("position").eq("module_id", moduleId),
  ]);

  const rows = planCourseImport(
    (sourceCourses ?? []).map(({ course_resource, ...c }) => ({
      ...c,
      resourceLinks: course_resource,
    })),
    courseIds,
    (existing ?? []).map((c) => c.position),
  );
  if (rows.length === 0) return { error: "Aucune des séances cochées n’a été trouvée." };

  for (const { resourceLinks, ...row } of rows) {
    const { data: created, error } = await supabase
      .from("course")
      .insert({ ...row, module_id: moduleId })
      .select("id")
      .single();
    if (error || !created) return { error: "L’import a échoué. Réessayez." };

    if (resourceLinks.length) {
      const { error: linkError } = await supabase.from("course_resource").insert(
        resourceLinks.map((l) => ({
          course_id: created.id,
          resource_id: l.resource_id,
          role: l.role,
        })),
      );
      if (linkError) return { error: "Les ressources d’une séance n’ont pas pu être liées." };
    }
  }

  revalidatePath(`/modules/${moduleId}`);
  revalidatePath("/dashboard");
  redirect(`/modules/${moduleId}#courses`);
}
