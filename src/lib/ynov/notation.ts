/**
 * Règles de notation YNOV.
 * Source : « MG COURS - Documentation Projet COMPLETE » (Notion) + procédure YNOV.
 *
 * | Heures du module | Notes totales | Notes de groupe | Notes individuelles |
 * | ---------------- | ------------- | --------------- | ------------------- |
 * | 4 à 16 h         | 2             | 1               | 1                   |
 * | 20 à 48 h        | 3             | 2               | 1                   |
 * | 52 à 70 h        | 5             | 3               | 2                   |
 *
 * Coefficients : note de groupe ×1, note individuelle ×3.
 */

export const GROUP_COEFFICIENT = 1;
export const INDIVIDUAL_COEFFICIENT = 3;

/** Barème YNOV / Hyperplanning : toutes les notes sont remontées sur 20. */
export const DEFAULT_MAX_SCORE = 20;

/** Total des points d'une grille (`null` sans critère). */
export function criteriaTotal(criteria: readonly { weight: number }[]): number | null {
  return criteria.length ? criteria.reduce((sum, c) => sum + c.weight, 0) : null;
}

/**
 * Barème effectif d'une évaluation : barème saisi, sinon total des critères de la
 * grille, sinon 20.
 */
export function effectiveMaxScore(
  maxScore: number | null | undefined,
  criteriaTotal: number | null | undefined,
): number {
  if (maxScore && maxScore > 0) return maxScore;
  if (criteriaTotal && criteriaTotal > 0) return criteriaTotal;
  return DEFAULT_MAX_SCORE;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Ramène une note sur 20 (ex. 15/30 → 10). Arrondi au centième. */
export function toTwenty(value: number, max: number = DEFAULT_MAX_SCORE): number {
  if (!(max > 0)) return value;
  return round2((value * DEFAULT_MAX_SCORE) / max);
}

/**
 * Note d'une grille ramenée au barème de l'évaluation (ex. grille sur 30 notée sur 20 :
 * 24/30 → 16). Sans barème distinct, renvoie le total brut.
 */
export function scaleGridTotal(total: number, gridTotal: number, maxScore: number | null): number {
  if (!maxScore || !(gridTotal > 0) || maxScore === gridTotal) return total;
  return round2((total * maxScore) / gridTotal);
}

export interface NoteRequirement {
  /** Nombre total de notes attendues. */
  total: number;
  /** Nombre de notes de groupe (coef ×1). */
  group: number;
  /** Nombre de notes individuelles (coef ×3). */
  individual: number;
  /**
   * `true` si le volume horaire tombe exactement dans un palier YNOV documenté.
   * `false` si on a extrapolé (volume hors paliers) — à confirmer avec l'école.
   */
  exact: boolean;
}

interface Bracket {
  minHours: number;
  maxHours: number;
  total: number;
  group: number;
  individual: number;
}

const BRACKETS: readonly Bracket[] = [
  { minHours: 4, maxHours: 16, total: 2, group: 1, individual: 1 },
  { minHours: 20, maxHours: 48, total: 3, group: 2, individual: 1 },
  { minHours: 52, maxHours: 70, total: 5, group: 3, individual: 2 },
] as const;

/**
 * Renvoie le nombre minimum de notes requises pour un module donné.
 * Pour un volume hors paliers (ex. 18 h, 50 h, 90 h), on retient le palier le
 * plus proche et `exact` vaut `false`.
 */
export function requiredNotes(totalHours: number): NoteRequirement {
  if (!Number.isFinite(totalHours) || totalHours <= 0) {
    return { total: 0, group: 0, individual: 0, exact: false };
  }

  const match = BRACKETS.find((b) => totalHours >= b.minHours && totalHours <= b.maxHours);
  if (match) {
    return {
      total: match.total,
      group: match.group,
      individual: match.individual,
      exact: true,
    };
  }

  // Hors palier : on prend le palier dont la borne est la plus proche.
  const nearest = BRACKETS.reduce((best, b) => {
    const dist = Math.min(Math.abs(totalHours - b.minHours), Math.abs(totalHours - b.maxHours));
    const bestDist = Math.min(
      Math.abs(totalHours - best.minHours),
      Math.abs(totalHours - best.maxHours),
    );
    return dist < bestDist ? b : best;
  });

  return {
    total: nearest.total,
    group: nearest.group,
    individual: nearest.individual,
    exact: false,
  };
}

export interface GradeInput {
  /** Note brute, sur `max`. */
  value: number;
  kind: "group" | "individual";
  /** Barème de la note (20 par défaut). */
  max?: number;
}

export interface WeightedResult {
  /** Somme des (note sur 20 × coefficient). */
  points: number;
  /** Somme des coefficients appliqués. */
  weight: number;
  /** Moyenne pondérée sur 20, ou `null` si aucune note. */
  average: number | null;
}

/**
 * Moyenne pondérée d'un ensemble de notes selon les coefficients YNOV
 * (groupe ×1, individuel ×3), chaque note étant d'abord ramenée sur 20.
 * `points` = total des points au sens YNOV.
 */
export function weightedAverage(grades: readonly GradeInput[]): WeightedResult {
  let points = 0;
  let weight = 0;

  for (const g of grades) {
    const coef = g.kind === "group" ? GROUP_COEFFICIENT : INDIVIDUAL_COEFFICIENT;
    points += toTwenty(g.value, g.max) * coef;
    weight += coef;
  }

  return {
    points,
    weight,
    average: weight === 0 ? null : points / weight,
  };
}

export interface NoteProgress {
  requirement: NoteRequirement;
  enteredGroup: number;
  enteredIndividual: number;
  enteredTotal: number;
  /** `true` si le minimum YNOV (total + répartition) est atteint. */
  satisfied: boolean;
  missingGroup: number;
  missingIndividual: number;
}

/** Compare les notes déjà saisies au minimum requis pour le module. */
export function noteProgress(
  totalHours: number,
  entered: { group: number; individual: number },
): NoteProgress {
  const requirement = requiredNotes(totalHours);
  const missingGroup = Math.max(0, requirement.group - entered.group);
  const missingIndividual = Math.max(0, requirement.individual - entered.individual);

  return {
    requirement,
    enteredGroup: entered.group,
    enteredIndividual: entered.individual,
    enteredTotal: entered.group + entered.individual,
    satisfied: missingGroup === 0 && missingIndividual === 0,
    missingGroup,
    missingIndividual,
  };
}
