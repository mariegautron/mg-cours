/**
 * États de préparation : UNE lecture commune pour les séances (`course.prep_status` : todo,
 * in_progress, ready) et pour les sujets d'évaluation (`assessment.prep_status` : to_build, ready,
 * provided). Les libellés restent dans src/lib/modules/schema.ts (séances) et
 * src/lib/assessments/subject.ts (sujets).
 */
type WithPrep = { prep_status?: string | null };

/** Séance prête (statut « Prête »). */
export function isSessionReady(course: WithPrep): boolean {
  return course.prep_status === "ready";
}

/** Sujet d'évaluation encore « à construire » (ni prêt, ni fourni par l'école). */
export function isSubjectToBuild(assessment: WithPrep): boolean {
  return !assessment.prep_status || assessment.prep_status === "to_build";
}
