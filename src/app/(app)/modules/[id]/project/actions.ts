"use server";

import { revalidatePath } from "next/cache";

import { drawThemes } from "@/lib/projects/draw";
import { readProjectForm, readSkeletonJson, readThemesJson } from "@/lib/projects/schema";
import { createClient } from "@/lib/supabase/server";
import { failure, NOT_FOUND } from "@/lib/messages";

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
  if (error) return { error: failure("enregistrer", { kept: true }) };

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
  if (!project) return { error: "Enregistre d’abord le projet." };

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
  if (error || !created) return { error: failure("créer les évaluations") };

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
      return { error: failure("créer les évaluations") };
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

export interface ThemesState {
  error?: string;
  saved?: boolean;
}

async function projectIdOf(moduleId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("module_project")
    .select("id")
    .eq("module_id", moduleId)
    .maybeSingle();
  return { supabase, projectId: data?.id ?? null };
}

/** Enregistre la liste des thèmes : ajoute, modifie, retire (un thème retiré libère ses groupes). */
export async function saveThemes(
  moduleId: string,
  _prev: ThemesState,
  formData: FormData,
): Promise<ThemesState> {
  const parsed = readThemesJson(String(formData.get("themesJson") ?? ""));
  if (!parsed.success) return { error: parsed.error };

  const { supabase, projectId } = await projectIdOf(moduleId);
  if (!projectId) return { error: "Enregistre d’abord le projet." };

  const { data: current } = await supabase
    .from("project_theme")
    .select("id")
    .eq("project_id", projectId);
  const currentIds = new Set((current ?? []).map((t) => t.id));
  // Un identifiant inconnu (autre projet) est traité comme un nouveau thème.
  const kept = parsed.themes.filter((t) => t.id && currentIds.has(t.id));
  const removed = [...currentIds].filter((id) => !kept.some((t) => t.id === id));

  if (removed.length) {
    const { error } = await supabase.from("project_theme").delete().in("id", removed);
    if (error) return { error: failure("enregistrer") };
  }
  for (const [position, theme] of parsed.themes.entries()) {
    const values = {
      title: theme.title,
      description_md: theme.descriptionMd,
      position,
    };
    const { error } =
      theme.id && currentIds.has(theme.id)
        ? await supabase.from("project_theme").update(values).eq("id", theme.id)
        : await supabase.from("project_theme").insert({ ...values, project_id: projectId });
    if (error) return { error: failure("enregistrer") };
  }

  revalidatePath(`/modules/${moduleId}/project`);
  return { saved: true };
}

export interface AssignmentResult {
  error?: string;
  message?: string;
}

/** Thème choisi par un groupe volontaire ; `themeId` vide : le groupe n'a plus de thème. */
export async function setGroupTheme(
  moduleId: string,
  groupId: string,
  themeId: string,
): Promise<AssignmentResult> {
  const { supabase, projectId } = await projectIdOf(moduleId);
  if (!projectId) return { error: NOT_FOUND.project };

  if (!themeId) {
    const { error } = await supabase
      .from("project_theme_assignment")
      .delete()
      .eq("project_id", projectId)
      .eq("student_group_id", groupId);
    if (error) return { error: failure("enregistrer") };
  } else {
    const [{ count: themeOk }, { count: groupOk }] = await Promise.all([
      supabase
        .from("project_theme")
        .select("id", { count: "exact", head: true })
        .eq("id", themeId)
        .eq("project_id", projectId),
      supabase
        .from("student_group")
        .select("id", { count: "exact", head: true })
        .eq("id", groupId)
        .eq("module_id", moduleId),
    ]);
    if (!themeOk || !groupOk) return { error: "Thème ou groupe inconnu." };

    const { error } = await supabase.from("project_theme_assignment").upsert(
      {
        project_id: projectId,
        student_group_id: groupId,
        theme_id: themeId,
        method: "volunteer",
        draw_seed: null,
        drawn_at: null,
      },
      { onConflict: "project_id,student_group_id" },
    );
    if (error) return { error: failure("enregistrer") };
  }

  revalidatePath(`/modules/${moduleId}/project`);
  return { message: "Choix enregistré." };
}

/**
 * Tire au sort les groupes qui n'ont pas de thème choisi (volontaires conservés). Un tirage déjà
 * fait n'est remplacé qu'avec `confirmRedraw` : sinon le serveur refuse.
 */
export async function drawGroupThemes(
  moduleId: string,
  confirmRedraw: boolean,
): Promise<AssignmentResult> {
  const { supabase, projectId } = await projectIdOf(moduleId);
  if (!projectId) return { error: NOT_FOUND.project };

  const [{ data: themes }, { data: groups }, { data: assignments }] = await Promise.all([
    supabase.from("project_theme").select("id").eq("project_id", projectId),
    supabase.from("student_group").select("id").eq("module_id", moduleId).eq("type", "project"),
    supabase.from("project_theme_assignment").select("*").eq("project_id", projectId),
  ]);
  if (!themes?.length) return { error: "Ajoute d’abord des thèmes." };
  if (!groups?.length) return { error: "Aucun groupe de projet dans ce module." };

  const previousDraws = (assignments ?? []).filter((a) => a.method === "draw");
  if (previousDraws.length > 0 && !confirmRedraw) {
    return { error: "Un tirage existe déjà : confirme pour le refaire." };
  }

  const groupIds = groups.map((g) => g.id);
  const volunteers = Object.fromEntries(
    (assignments ?? [])
      .filter((a) => a.method === "volunteer" && groupIds.includes(a.student_group_id))
      .map((a) => [a.student_group_id, a.theme_id]),
  );
  const seed = crypto.randomUUID().slice(0, 8);
  const result = drawThemes({
    groupIds,
    themeIds: themes.map((t) => t.id),
    volunteers,
    seed,
  }).filter((r) => r.method === "draw");
  if (result.length === 0) return { message: "Tous les groupes ont déjà choisi leur thème." };

  if (previousDraws.length) {
    const { error } = await supabase
      .from("project_theme_assignment")
      .delete()
      .eq("project_id", projectId)
      .eq("method", "draw");
    if (error) return { error: failure("faire le tirage") };
  }
  const drawnAt = new Date().toISOString();
  const { error } = await supabase.from("project_theme_assignment").upsert(
    result.map((r) => ({
      project_id: projectId,
      student_group_id: r.groupId,
      theme_id: r.themeId,
      method: "draw" as const,
      draw_seed: seed,
      drawn_at: drawnAt,
    })),
    { onConflict: "project_id,student_group_id" },
  );
  if (error) return { error: failure("faire le tirage") };

  revalidatePath(`/modules/${moduleId}/project`);
  return {
    message: `Tirage effectué pour ${result.length} groupe${result.length > 1 ? "s" : ""} (graine ${seed}).`,
  };
}
