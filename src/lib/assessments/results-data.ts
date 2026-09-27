import { getAssessment, getGradesByAssessment, listComments } from "@/lib/assessments/queries";
import { buildResultSheets, type ResultSheet } from "@/lib/assessments/results";
import { getModule } from "@/lib/modules/queries";

/** Fiches de résultats d'une évaluation (vide si introuvable ou aucune note saisie). */
export async function loadResultSheets(
  moduleId: string,
  assessmentId: string,
): Promise<ResultSheet[] | null> {
  const [mod, assessment, grades, comments] = await Promise.all([
    getModule(moduleId),
    getAssessment(assessmentId),
    getGradesByAssessment(assessmentId),
    listComments(),
  ]);
  if (!mod || !assessment || assessment.module_id !== moduleId || assessment.groups.length === 0) {
    return null;
  }
  return buildResultSheets({
    moduleName: mod.name,
    assessment,
    groups: assessment.groups,
    criteria: assessment.grading_grid?.criteria ?? [],
    grades,
    comments,
  });
}
