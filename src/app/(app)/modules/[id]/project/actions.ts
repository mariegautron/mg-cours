"use server";

import { revalidatePath } from "next/cache";

import { readProjectForm, readSkeletonJson } from "@/lib/projects/schema";
import { createClient } from "@/lib/supabase/server";

export interface ProjectFormState {
  error?: string;
  saved?: boolean;
  fieldErrors?: Record<string, string[]>;
}

export interface SkeletonState {
  error?: string;
  created?: number;
}

function flatten(fieldErrors: Record<string, string[] | undefined>): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(fieldErrors).filter(([, v]) => v && v.length) as [string, string[]][],
  );
}

/** Crée ou met à jour le projet fil rouge du module (un seul par module). */
export async function saveProject(
  moduleId: string,
  _prev: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const parsed = readProjectForm(formData);
  if (!parsed.success) return { fieldErrors: flatten(parsed.error.flatten().fieldErrors) };

  const supabase = await createClient();
  const { error } = await supabase.from("module_project").upsert(
    {
      module_id: moduleId,
      title: parsed.data.title,
      brief_md: parsed.data.briefMd,
      client_context_md: parsed.data.clientContextMd,
    },
    { onConflict: "module_id" },
  );
  if (error) return { error: "Enregistrement impossible." };

  revalidatePath(`/modules/${moduleId}/project`);
  return { saved: true };
}

/** Crée les évaluations du squelette (modifié par Marie) et les rattache au projet. */
export async function createSkeleton(
  moduleId: string,
  _prev: SkeletonState,
  formData: FormData,
): Promise<SkeletonState> {
  const parsed = readSkeletonJson(String(formData.get("itemsJson") ?? ""));
  if (!parsed.success) return { error: parsed.error };

  const supabase = await createClient();
  const { data: project } = await supabase
    .from("module_project")
    .select("id")
    .eq("module_id", moduleId)
    .maybeSingle();
  if (!project) return { error: "Enregistrez d’abord le projet." };

  const [{ data: groups }, { count: existing }] = await Promise.all([
    supabase.from("student_group").select("id").eq("module_id", moduleId),
    supabase
      .from("assessment")
      .select("id", { count: "exact", head: true })
      .eq("project_id", project.id),
  ]);
  const start = existing ?? 0;

  const { data: created, error } = await supabase
    .from("assessment")
    .insert(
      parsed.items.map((item, i) => ({
        module_id: moduleId,
        title: item.title,
        type: item.role === "oral" ? "oral" : item.role === "individual" ? "écrit" : "projet",
        date: item.date,
        is_group_grade: item.isGroupGrade,
        project_id: project.id,
        project_role: item.role,
        project_position: start + i + 1,
      })),
    )
    .select("id");
  if (error || !created) return { error: "Création impossible." };

  // Comme une évaluation créée à la main : tous les groupes du module sont visés, Marie retire
  // ceux qui ne le sont pas depuis la fiche de l'évaluation.
  const groupIds = (groups ?? []).map((g) => g.id);
  if (groupIds.length) {
    const { error: groupsError } = await supabase
      .from("assessment_group")
      .insert(
        created.flatMap((a) =>
          groupIds.map((student_group_id) => ({ assessment_id: a.id, student_group_id })),
        ),
      );
    if (groupsError) {
      await supabase
        .from("assessment")
        .delete()
        .in(
          "id",
          created.map((a) => a.id),
        );
      return { error: "Création impossible." };
    }
  }

  revalidatePath(`/modules/${moduleId}/project`);
  revalidatePath(`/modules/${moduleId}/assessments`);
  revalidatePath(`/modules/${moduleId}`);
  return { created: created.length };
}

/** Supprime le projet ; les évaluations (et leurs notes) sont conservées, détachées du projet. */
export async function deleteProject(moduleId: string): Promise<void> {
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("module_project")
    .select("id")
    .eq("module_id", moduleId)
    .maybeSingle();
  if (!project) return;

  await supabase
    .from("assessment")
    .update({ project_id: null, project_role: null, project_position: null })
    .eq("project_id", project.id);
  await supabase.from("module_project").delete().eq("id", project.id);

  revalidatePath(`/modules/${moduleId}/project`);
  revalidatePath(`/modules/${moduleId}/assessments`);
}
