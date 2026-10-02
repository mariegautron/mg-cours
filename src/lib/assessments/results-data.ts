import {
  getAssessment,
  getGradesByAssessment,
  listComments,
  listGroupGradeMembers,
} from "@/lib/assessments/queries";
import { buildResultSheets, type ResultSheet } from "@/lib/assessments/results";
import { getModule } from "@/lib/modules/queries";
import { themeTitleByGroup } from "@/lib/projects/queries";
import { getAbsenceRuleForModule } from "@/lib/settings/rules-queries";

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
  const memberOverrides = await listGroupGradeMembers(
    grades.filter((g) => g.student_group_id).map((g) => g.id),
  );
  const [themesByGroup, absenceRule] = await Promise.all([
    themeTitleByGroup(assessment.project_id),
    getAbsenceRuleForModule(moduleId),
  ]);
  return buildResultSheets({
    moduleName: mod.name,
    assessment,
    groups: assessment.groups,
    criteria: assessment.grading_grid?.criteria ?? [],
    axes: assessment.grading_grid?.axes ?? [],
    grades,
    memberOverrides,
    absenceRule,
    comments,
    themesByGroup,
  });
}
