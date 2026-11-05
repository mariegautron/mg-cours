"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { planCourseImport } from "@/lib/modules/course-import";
import { createClient } from "@/lib/supabase/server";
import { failure, NOT_FOUND } from "@/lib/messages";

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
  if (courseIds.length === 0) return { error: "Coche au moins une séance à importer." };
  if (sourceId === moduleId) return { error: "Choisis un autre module." };

  const supabase = await createClient();
  // Les deux modules doivent appartenir à l'utilisatrice connectée (la RLS ne renvoie rien sinon).
  const [{ data: target }, { data: source }] = await Promise.all([
    supabase.from("module").select("id").eq("id", moduleId).maybeSingle(),
    supabase.from("module").select("id").eq("id", sourceId).maybeSingle(),
  ]);
  if (!target || !source) return { error: NOT_FOUND.module };

  const [{ data: sourceCourses }, { data: existing }, plansResult] = await Promise.all([
    supabase
      .from("course")
      .select(
        "id, title, type, position, learning_objectives, animation_notes, assessment_notes, material, course_resource(resource_id, role, activity_type, duration_minutes, pedagogical_objective)",
      )
      .eq("module_id", sourceId),
    supabase.from("course").select("position").eq("module_id", moduleId),
    // Ordre du déroulé et livrable de chaque séance (table absente : on importe sans).
    supabase
      .from("course_plan")
      .select("course_id, deliverable, resource_order")
      .in("course_id", courseIds),
  ]);
  const plans = new Map((plansResult.data ?? []).map((p) => [p.course_id, p]));

  const rows = planCourseImport(
    (sourceCourses ?? []).map(({ course_resource, ...c }) => ({
      ...c,
      resourceLinks: course_resource,
    })),
    courseIds,
    (existing ?? []).map((c) => c.position),
  );
  if (rows.length === 0) return { error: "Aucune des séances cochées n’a été trouvée." };

  // `planCourseImport` garde l'ordre du module source : la n-ième ligne est la n-ième séance cochée.
  const picked = (sourceCourses ?? [])
    .filter((c) => courseIds.includes(c.id))
    .toSorted((a, b) => a.position - b.position);
  const details = new Map(
    picked.map((c) => [c.id, new Map(c.course_resource.map((l) => [l.resource_id, l]))]),
  );

  for (const [rowIndex, { resourceLinks, ...row }] of rows.entries()) {
    const sourceCourseId = picked[rowIndex]?.id;
    const { data: created, error } = await supabase
      .from("course")
      .insert({ ...row, module_id: moduleId })
      .select("id")
      .single();
    if (error || !created) return { error: failure("importer les séances", { kept: true }) };

    if (resourceLinks.length) {
      const { error: linkError } = await supabase.from("course_resource").insert(
        resourceLinks.map((l) => {
          const d = sourceCourseId ? details.get(sourceCourseId)?.get(l.resource_id) : undefined;
          return {
            course_id: created.id,
            resource_id: l.resource_id,
            role: l.role,
            activity_type: d?.activity_type ?? null,
            duration_minutes: d?.duration_minutes ?? null,
            pedagogical_objective: d?.pedagogical_objective ?? null,
          };
        }),
      );
      if (linkError) return { error: "Les ressources d’une séance n’ont pas pu être liées." };
    }

    // Conserve l'ordre du déroulé et le livrable de la séance source.
    const plan = sourceCourseId ? plans.get(sourceCourseId) : undefined;
    if (plan) {
      await supabase.from("course_plan").insert({
        course_id: created.id,
        deliverable: plan.deliverable,
        resource_order: plan.resource_order,
      });
    }
  }

  revalidatePath(`/modules/${moduleId}`);
  revalidatePath("/dashboard");
  redirect(`/modules/${moduleId}/courses`);
}
