import { listModuleAssessments, type AssessmentWithMeta } from "@/lib/assessments/queries";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/db";

export type ProjectAssessment = AssessmentWithMeta & {
  project_role: NonNullable<AssessmentWithMeta["project_role"]>;
};

export interface ModuleProject extends Tables<"module_project"> {
  /** Évaluations rattachées au projet, dans l'ordre de création. */
  assessments: ProjectAssessment[];
  /** Thèmes proposés, dans l'ordre. */
  themes: Tables<"project_theme">[];
  /** Affectation d'un thème par groupe (au plus une par groupe). */
  assignments: Tables<"project_theme_assignment">[];
  /** Groupes de projet du module (candidats à un thème), par nom. */
  groups: Pick<Tables<"student_group">, "id" | "name">[];
}

export async function getModuleProject(moduleId: string): Promise<ModuleProject | null> {
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("module_project")
    .select("*")
    .eq("module_id", moduleId)
    .maybeSingle();
  if (!project) return null;

  const [all, { data: themes }, { data: assignments }, { data: groups }] = await Promise.all([
    listModuleAssessments(moduleId),
    supabase.from("project_theme").select("*").eq("project_id", project.id).order("position"),
    supabase.from("project_theme_assignment").select("*").eq("project_id", project.id),
    supabase
      .from("student_group")
      .select("id, name")
      .eq("module_id", moduleId)
      .eq("type", "project")
      .order("name"),
  ]);
  const assessments = all
    .filter((a): a is ProjectAssessment => a.project_id === project.id && a.project_role !== null)
    .sort((a, b) => (a.project_position ?? 0) - (b.project_position ?? 0));
  return {
    ...project,
    assessments,
    themes: themes ?? [],
    assignments: assignments ?? [],
    groups: groups ?? [],
  };
}

/** Titre du thème de chaque groupe d'un projet (groupe sans thème : absent). */
export async function themeTitleByGroup(
  projectId: string | null | undefined,
): Promise<Record<string, string>> {
  if (!projectId) return {};
  const supabase = await createClient();
  const { data } = await supabase
    .from("project_theme_assignment")
    .select("student_group_id, theme:theme_id(title)")
    .eq("project_id", projectId);
  const out: Record<string, string> = {};
  for (const row of (data ?? []) as unknown as {
    student_group_id: string;
    theme: { title: string } | null;
  }[]) {
    if (row.theme) out[row.student_group_id] = row.theme.title;
  }
  return out;
}

export interface ReusableProject {
  id: string;
  title: string;
  moduleId: string;
  moduleName: string;
  year: number;
}

/** Projets des autres modules (récents d'abord), pour « Partir d'un projet existant ». */
export async function listReusableProjects(excludeModuleId: string): Promise<ReusableProject[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("module_project")
    .select("id, title, module:module_id(id, name, year)")
    .neq("module_id", excludeModuleId);
  return (
    (data ?? []) as unknown as {
      id: string;
      title: string;
      module: { id: string; name: string; year: number } | null;
    }[]
  )
    .filter((p) => p.module)
    .map((p) => ({
      id: p.id,
      title: p.title,
      moduleId: p.module!.id,
      moduleName: p.module!.name,
      year: p.module!.year,
    }))
    .sort((a, b) => b.year - a.year || a.moduleName.localeCompare(b.moduleName, "fr"));
}
