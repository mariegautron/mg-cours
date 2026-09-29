import { listModuleAssessments, type AssessmentWithMeta } from "@/lib/assessments/queries";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/db";

export type ProjectAssessment = AssessmentWithMeta & {
  project_role: NonNullable<AssessmentWithMeta["project_role"]>;
};

export interface ModuleProject extends Tables<"module_project"> {
  /** Évaluations rattachées au projet, dans l'ordre de création. */
  assessments: ProjectAssessment[];
}

export async function getModuleProject(moduleId: string): Promise<ModuleProject | null> {
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("module_project")
    .select("*")
    .eq("module_id", moduleId)
    .maybeSingle();
  if (!project) return null;

  const assessments = (await listModuleAssessments(moduleId))
    .filter((a): a is ProjectAssessment => a.project_id === project.id && a.project_role !== null)
    .sort((a, b) => (a.project_position ?? 0) - (b.project_position ?? 0));
  return { ...project, assessments };
}
