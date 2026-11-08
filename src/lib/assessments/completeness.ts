import { gradingProgress, type ScoringCriterion } from "@/lib/assessments/scoring";

/**
 * Règle unique de complétude d'une copie. Utilisée par la correction, les cartes, les moyennes,
 * les appréciations, les résultats, le tableau de bord et la recherche.
 *
 * - « corrigée » : tous les critères (hors bonus) notés, validés d'office compris, ou absence posée ;
 * - « en cours » : au moins un critère saisi, mais pas tous ;
 * - « à corriger » : rien de saisi.
 * Sans grille (note directe, barème) : corrigée dès qu'une note existe.
 */
export type Completion = "none" | "partial" | "complete";

export interface CompletionGrade {
  value: number | null;
  scores?: unknown;
  attendance?: string | null;
}

export interface CompletionCriterion {
  id: string;
  isBonus?: boolean;
}

export interface CompletionResult {
  state: Completion;
  scored: number;
  total: number;
}

const isRecord = (v: unknown): v is Record<string, number | null | undefined> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

export function gradeCompletion(
  grade: CompletionGrade | null | undefined,
  criteria: readonly CompletionCriterion[],
  autoValidatedIds: readonly string[] = [],
): CompletionResult {
  if (!grade) return { state: "none", scored: 0, total: criteria.filter((c) => !c.isBonus).length };
  const required = criteria.filter((c) => !c.isBonus).length;
  // Absence posée (excusée ou non prévenue) : rien à noter, la copie est traitée.
  if (grade.attendance && grade.attendance !== "present") {
    return { state: "complete", scored: required, total: required };
  }
  // Sans grille (ou grille sans critère à noter) : une note enregistrée suffit.
  if (required === 0) {
    return { state: grade.value !== null ? "complete" : "none", scored: 0, total: 0 };
  }
  const scoring: ScoringCriterion[] = criteria.map((c) => ({
    id: c.id,
    weight: 0,
    isBonus: c.isBonus,
  }));
  return gradingProgress(scoring, isRecord(grade.scores) ? grade.scores : {}, autoValidatedIds);
}

/** `true` si la note de cette copie peut entrer dans les moyennes, appréciations et résultats. */
export function isGradeCounted(
  grade: CompletionGrade | null | undefined,
  criteria: readonly CompletionCriterion[],
  autoValidatedIds: readonly string[] = [],
): boolean {
  return (
    !!grade &&
    grade.value !== null &&
    gradeCompletion(grade, criteria, autoValidatedIds).state === "complete"
  );
}

/**
 * Garde de lecture : une copie incomplète n'a pas de note, même si une ancienne version en a
 * enregistré une. Renvoie les lignes avec `value = null` pour celles qui ne comptent pas.
 */
export function guardIncompleteGrades<T extends CompletionGrade>(
  rows: readonly T[],
  criteria: readonly CompletionCriterion[],
  autoValidatedIds: readonly string[] = [],
): T[] {
  return rows.map((row) =>
    row.value !== null && !isGradeCounted(row, criteria, autoValidatedIds)
      ? { ...row, value: null }
      : row,
  );
}
