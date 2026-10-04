import {
  getAssessment,
  getGradesByAssessment,
  listComments,
  listGroupGradeMembers,
  moduleStudentAverages,
} from "@/lib/assessments/queries";
import { bonusLine } from "@/lib/assessments/score-scale";
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
  const sheets = buildResultSheets({
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
  // Note bonus de certification : l'effet réel sur la moyenne de chaque personne.
  if (assessment.is_bonus) {
    const averages = await moduleStudentAverages(moduleId);
    const effectOf = new Map(averages.map((a) => [a.student.id, a.bonusEffect]));
    for (const sheet of sheets) {
      const id = sheet.recipients[0]?.id;
      sheet.bonusLine = bonusLine(id ? (effectOf.get(id) ?? null) : null);
    }
  }
  return sheets;
}
