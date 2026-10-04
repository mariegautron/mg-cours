import type { SubjectDeckInput } from "@/components/present/deck";
import { getAssessment, listModuleAssessments } from "@/lib/assessments/queries";
import { cadreBlocks } from "@/lib/assessments/cadre";
import { groupByAxis } from "@/lib/assessments/scoring";
import { canPresent, evaluatedCriteria, subjectSections } from "@/lib/assessments/subject";
import { createClient } from "@/lib/supabase/server";

/** Sujet projetable d'une évaluation, ou `null` si « à construire » ou sans contenu. */
export async function loadSubjectDeck(assessmentId: string): Promise<SubjectDeckInput | null> {
  const assessment = await getAssessment(assessmentId);
  if (!assessment || !canPresent(assessment.prep_status)) return null;
  const grid = assessment.grading_grid;

  // Séance du rendu : sa date et son numéro complètent « Quand » quand l'évaluation n'a pas de date.
  let sessionDate: string | null = null;
  let sessionNumber: number | null = null;
  if (assessment.course_id) {
    const supabase = await createClient();
    const { data: courses } = await supabase
      .from("course")
      .select("id, session_date")
      .eq("module_id", assessment.module_id)
      .order("position")
      .order("created_at");
    const index = (courses ?? []).findIndex((c) => c.id === assessment.course_id);
    if (index >= 0) {
      sessionNumber = index + 1;
      sessionDate = courses?.[index].session_date ?? null;
    }
  }

  return {
    title: assessment.title,
    type: assessment.type,
    durationMinutes: assessment.duration_minutes,
    sections: subjectSections(assessment),
    criteria: evaluatedCriteria(grid?.criteria ?? []),
    cadre: {
      eyebrow: `${assessment.title} · Ce que vous devez faire`,
      heading: assessment.objective?.trim() || assessment.title,
      blocks: cadreBlocks({
        title: assessment.title,
        objective: assessment.objective,
        date: assessment.date ?? sessionDate,
        sessionNumber,
        startTime: assessment.oral_start_time,
        isGroupGrade: assessment.is_group_grade,
        deliverableMd: assessment.deliverable_md,
        maxScore: assessment.maxScore,
        hasGrid: !!grid && grid.criteria.length > 0,
        whereToSubmit: assessment.where_to_submit ?? null,
      }),
    },
    grid:
      grid && grid.criteria.length
        ? {
            eyebrow: `${assessment.title} · Ce sur quoi vous serez évalué·es`,
            maxScore: assessment.maxScore,
            total: grid.criteria.filter((c) => !c.is_bonus).reduce((n, c) => n + c.weight, 0),
            axes: groupByAxis(grid.criteria, grid.axes).map((g) => ({
              label: g.axis?.label ?? null,
              points: g.criteria.filter((c) => !c.is_bonus).reduce((n, c) => n + c.weight, 0),
              criteria: g.criteria.map((c) => ({
                label: c.label,
                weight: c.weight,
                bonus: c.is_bonus,
                levels: c.levels.map((l) => ({ points: l.points, description: l.description })),
              })),
            })),
          }
        : undefined,
  };
}

/** Sujets des évaluations prêtes ou fournies rattachées à une séance (« Faire cours »). */
export async function loadCourseSubjects(
  moduleId: string,
  courseId: string,
): Promise<SubjectDeckInput[]> {
  const linked = (await listModuleAssessments(moduleId)).filter(
    (a) => a.course_id === courseId && canPresent(a.prep_status),
  );
  const decks = await Promise.all(linked.map((a) => loadSubjectDeck(a.id)));
  return decks.filter((d): d is SubjectDeckInput => d !== null);
}
