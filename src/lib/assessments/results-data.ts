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
  if (!mod || !assessment || assessment.module_id !== moduleId || !assessment.student_group) {
    return null;
  }
  return buildResultSheets({
    moduleName: mod.name,
    assessment,
    group: assessment.student_group,
    criteria: assessment.grading_grid?.criteria ?? [],
    grades,
    comments,
  });
}
