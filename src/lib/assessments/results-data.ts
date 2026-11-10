import {
  getAssessment,
  getGradesByAssessment,
  listComments,
  listGroupGradeMembers,
  moduleStudentAverages,
} from "@/lib/assessments/queries";
import { bonusLine } from "@/lib/assessments/score-scale";
import { buildResultSheets, type ResultSheet } from "@/lib/assessments/results";
import { getQuizByAssessment } from "@/lib/quiz/queries";
import { parseWrittenReview } from "@/lib/assessments/open-review";
import { createClient } from "@/lib/supabase/server";
import { toTwenty } from "@/lib/ynov/notation";
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
  const [themesByGroup, absenceRule, quiz] = await Promise.all([
    themeTitleByGroup(assessment.project_id),
    getAbsenceRuleForModule(moduleId),
    getQuizByAssessment(assessmentId),
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
    hasQuiz: !!quiz,
  });
  // Absence excusée rattrapée (évaluation individuelle) : la note du rattrapage remplace l'absence,
  // comme dans les moyennes et la page Rattrapages (« Note remplacée »).
  if (!assessment.is_group_grade) await applyMakeupGrades(assessmentId, sheets);
  // Questions ouvertes : sous chaque critère, les questions tirées avec leur commentaire et leurs points
  // (photo écrite par Marie ; jamais l'attendu ni ses notes privées).
  await attachOpenQuestions(assessmentId, sheets);
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

async function attachOpenQuestions(assessmentId: string, sheets: ResultSheet[]) {
  const supabase = await createClient();
  const { data: quiz } = await supabase
    .from("quiz")
    .select("id, correction_mode")
    .eq("assessment_id", assessmentId)
    .maybeSingle();
  if (!quiz || quiz.correction_mode !== "open_questions") return;
  const { data: attempts } = await supabase
    .from("quiz_attempt")
    .select("id, student_id")
    .eq("quiz_id", quiz.id);
  const ids = (attempts ?? []).map((a) => a.id);
  if (ids.length === 0) return;
  const { data: reviews } = await supabase
    .from("open_review")
    .select("attempt_id, written, locked")
    .in("attempt_id", ids)
    .eq("locked", true);
  const studentOf = new Map((attempts ?? []).map((a) => [a.id, a.student_id]));
  const writtenOf = new Map<string, NonNullable<ReturnType<typeof parseWrittenReview>>>();
  for (const r of reviews ?? []) {
    const w = parseWrittenReview(r.written);
    const student = studentOf.get(r.attempt_id);
    if (w && student) writtenOf.set(student, w);
  }
  for (const sheet of sheets) {
    const written = sheet.recipients[0]?.id ? writtenOf.get(sheet.recipients[0].id) : undefined;
    if (!written) continue;
    for (const line of sheet.criteria) {
      const found = written.criteria.find((c) => c.label === line.label);
      if (found)
        line.questions = found.questions.map((q) => ({
          position: q.position,
          statement: q.statement,
          points: q.points,
          max: q.max,
          comment: q.comment,
        }));
    }
  }
}

/**
 * Remplace, sur les fiches d'une évaluation individuelle, une absence excusée sans note par la note du
 * rattrapage quand elle existe (même barème effectif que la page Rattrapages et les moyennes).
 */
async function applyMakeupGrades(assessmentId: string, sheets: ResultSheet[]) {
  const supabase = await createClient();
  const { data: makeup } = await supabase
    .from("assessment")
    .select("id, title")
    .eq("makeup_of_id", assessmentId)
    .maybeSingle();
  if (!makeup) return;
  const [full, grades] = await Promise.all([
    getAssessment(makeup.id),
    getGradesByAssessment(makeup.id),
  ]);
  if (!full) return;
  const valueOf = new Map(
    grades
      .filter((g) => g.student_id && g.value !== null)
      .map((g) => [g.student_id as string, g.value as number]),
  );
  for (const sheet of sheets) {
    const id = sheet.recipients[0]?.id;
    if (!id || sheet.attendance !== "absent_excused" || sheet.value !== null) continue;
    const value = valueOf.get(id);
    if (value === undefined) continue;
    sheet.value = value;
    sheet.maxScore = full.maxScore;
    sheet.valueOn20 = toTwenty(value, full.maxScore);
    sheet.makeupTitle = makeup.title;
  }
}
