import { planAssessmentCopy } from "@/lib/modules/duplicate-evaluations";
import type { Tables, TablesInsert } from "@/types/db";

/**
 * Rattrapage d'un sujet individuel (US-96) : évaluation liée à l'originale, même grille, même
 * coefficient, même barème, réservée aux absent·es excusé·es. Fonctions pures.
 */

export const MAKEUP_PREFIX = "Rattrapage — ";

export function makeupTitle(title: string): string {
  return `${MAKEUP_PREFIX}${title}`;
}

/** Étudiant·es absent·es excusé·es d'une évaluation individuelle (sans doublon, ordre conservé). */
export function excusedStudentIds(
  grades: readonly Pick<Tables<"grade">, "student_id" | "attendance">[],
): string[] {
  return Array.from(
    new Set(
      grades.flatMap((g) =>
        g.attendance === "absent_excused" && g.student_id ? [g.student_id] : [],
      ),
    ),
  );
}

/** Raison pour laquelle un rattrapage n'est pas possible, ou `null` s'il l'est. */
export function makeupBlocker(
  original: Pick<Tables<"assessment">, "is_group_grade" | "makeup_of_id">,
  excusedCount: number,
): string | null {
  if (original.makeup_of_id) return "Cette évaluation est déjà un rattrapage.";
  if (original.is_group_grade)
    return "Le rattrapage ne concerne que les sujets individuels : une note de groupe ne se rattrape pas.";
  if (excusedCount === 0)
    return "Personne n’est absent·e excusé·e sur cette évaluation : il n’y a rien à rattraper.";
  return null;
}

/**
 * Nouveau rattrapage : le sujet de l'original en brouillon « à construire » (à modifier avant de le
 * fournir), même grille, coefficient et barème, sans date ni séance ni projet.
 */
export function planMakeup(original: Tables<"assessment">): TablesInsert<"assessment"> {
  return {
    ...planAssessmentCopy(original, {
      moduleId: original.module_id,
      courseIds: new Map(),
      projectId: null,
    }),
    title: makeupTitle(original.title),
    makeup_of_id: original.id,
    prep_status: "to_build",
  };
}

/**
 * Ce qu'un rattrapage garde toujours de l'original : la grille, le coefficient, le barème et le
 * caractère individuel ne se modifient pas depuis le formulaire du rattrapage.
 */
export function makeupInvariants(
  original: Pick<
    Tables<"assessment">,
    "grading_grid_id" | "coefficient" | "max_score" | "auto_validated_criterion_ids"
  >,
) {
  return {
    grading_grid_id: original.grading_grid_id,
    coefficient: original.coefficient,
    max_score: original.max_score,
    auto_validated_criterion_ids: original.auto_validated_criterion_ids,
    is_group_grade: false,
  };
}

/** Absent·es excusé·es pas encore inscrit·es au rattrapage existant. */
export function missingTargets(excused: readonly string[], enrolled: readonly string[]): string[] {
  const have = new Set(enrolled);
  return excused.filter((id) => !have.has(id));
}
