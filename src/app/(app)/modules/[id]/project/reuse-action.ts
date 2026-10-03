"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { failure, NOT_FOUND } from "@/lib/messages";
import { planProjectReuse } from "@/lib/projects/reuse";
import { createClient } from "@/lib/supabase/server";

export interface ReuseState {
  error?: string;
  done?: boolean;
  toRewrite?: string[];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Crée le projet de ce module à partir du projet d'un autre module (le cadre seulement : jamais de
 * notes, groupes, rendus, dates ni affectations de thèmes).
 */
export async function startFromProject(
  moduleId: string,
  _prev: ReuseState,
  formData: FormData,
): Promise<ReuseState> {
  const sourceId = String(formData.get("sourceProjectId") ?? "");
  const keepThemes = formData.get("keepThemes") === "on";
  // Nouveau thème : titre et client facultatifs (à défaut, le titre du projet repris et un contexte vide).
  const newTitle = String(formData.get("title") ?? "")
    .trim()
    .slice(0, 200);
  const newClient = String(formData.get("client") ?? "")
    .trim()
    .slice(0, 2000);
  if (!UUID.test(sourceId)) return { error: "Choisis un projet à reprendre." };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("module_project")
    .select("id")
    .eq("module_id", moduleId)
    .maybeSingle();
  if (existing) return { error: "Ce module a déjà un projet." };
  const { data: mod } = await supabase.from("module").select("id").eq("id", moduleId).maybeSingle();
  if (!mod) return { error: NOT_FOUND.module };

  const { data: source } = await supabase
    .from("module_project")
    .select("id, title, brief_md, module_id")
    .eq("id", sourceId)
    .maybeSingle();
  if (!source || source.module_id === moduleId) return { error: NOT_FOUND.project };
  const [{ data: assessments }, { data: themes }] = await Promise.all([
    supabase.from("assessment").select("*").eq("project_id", source.id),
    supabase
      .from("project_theme")
      .select("title, description_md, position")
      .eq("project_id", source.id)
      .order("position"),
  ]);

  const { data: created, error } = await supabase
    .from("module_project")
    .insert({
      module_id: moduleId,
      title: newTitle || source.title,
      brief_md: source.brief_md,
      client_context_md: newClient ? `**Client :** ${newClient}` : "",
    })
    .select("id")
    .single();
  if (error || !created) return { error: failure("créer le projet") };

  const plan = planProjectReuse(
    {
      title: source.title,
      brief_md: source.brief_md,
      assessments: assessments ?? [],
      themes: themes ?? [],
    },
    { moduleId, projectId: created.id, keepThemes },
  );

  const rollback = async () => {
    await supabase.from("module_project").delete().eq("id", created.id);
  };

  if (plan.themes.length) {
    const { error: themeError } = await supabase
      .from("project_theme")
      .insert(plan.themes.map((t, position) => ({ project_id: created.id, position, ...t })));
    if (themeError) {
      await rollback();
      return { error: failure("copier les thèmes") };
    }
  }
  if (plan.assessments.length) {
    const { data: newAssessments, error: aError } = await supabase
      .from("assessment")
      .insert(plan.assessments)
      .select("id");
    if (aError || !newAssessments) {
      await rollback();
      return { error: failure("copier les évaluations") };
    }
    // Comme une évaluation créée à la main : tous les groupes du module sont visés (aucun copié d'ailleurs).
    const { data: groups } = await supabase
      .from("student_group")
      .select("id")
      .eq("module_id", moduleId);
    const groupIds = (groups ?? []).map((g) => g.id);
    if (groupIds.length) {
      await supabase
        .from("assessment_group")
        .insert(
          newAssessments.flatMap((a) =>
            groupIds.map((student_group_id) => ({ assessment_id: a.id, student_group_id })),
          ),
        );
    }
  }

  revalidatePath(`/modules/${moduleId}/project`);
  revalidatePath(`/modules/${moduleId}/assessments`);
  revalidatePath(`/modules/${moduleId}`);
  redirect(`/modules/${moduleId}/project`);
}
