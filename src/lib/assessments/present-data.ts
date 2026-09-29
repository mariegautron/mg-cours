import type { SubjectDeckInput } from "@/components/present/deck";
import { getAssessment, listModuleAssessments } from "@/lib/assessments/queries";
import { canPresent, evaluatedCriteria, subjectSections } from "@/lib/assessments/subject";

/** Sujet projetable d'une évaluation, ou `null` si « à construire » ou sans contenu. */
export async function loadSubjectDeck(assessmentId: string): Promise<SubjectDeckInput | null> {
  const assessment = await getAssessment(assessmentId);
  if (!assessment || !canPresent(assessment.prep_status)) return null;
  return {
    title: assessment.title,
    type: assessment.type,
    durationMinutes: assessment.duration_minutes,
    sections: subjectSections(assessment),
    criteria: evaluatedCriteria(assessment.grading_grid?.criteria ?? []),
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
