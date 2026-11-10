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

/** Palier d'heures → notes exigées (de groupe, individuelles). */
export interface GradingBracket {
  minHours: number;
  maxHours: number;
  group: number;
  individual: number;
}

/**
 * Règles de notation d'une école : paliers d'heures, coefficients, bonus de certification.
 * Les valeurs YNOV sont celles par défaut (école sans réglage, module sans école).
 */
export interface GradingRules {
  groupCoefficient: number;
  individualCoefficient: number;
  brackets: readonly GradingBracket[];
  /** Les notes bonus (certification) peuvent remonter la moyenne, jamais la baisser. */
  bonusAllowed: boolean;
}

export const YNOV_BRACKETS: readonly GradingBracket[] = [
  { minHours: 4, maxHours: 16, group: 1, individual: 1 },
  { minHours: 20, maxHours: 48, group: 2, individual: 1 },
  { minHours: 52, maxHours: 70, group: 3, individual: 2 },
];

export const YNOV_GRADING: GradingRules = {
  groupCoefficient: GROUP_COEFFICIENT,
  individualCoefficient: INDIVIDUAL_COEFFICIENT,
  brackets: YNOV_BRACKETS,
  bonusAllowed: true,
};

/** Coefficient de la règle (YNOV par défaut) selon que la note est de groupe ou individuelle. */
export function coefficientFor(isGroupGrade: boolean, rules: GradingRules = YNOV_GRADING): number {
  return isGroupGrade ? rules.groupCoefficient : rules.individualCoefficient;
}

/** Barème YNOV / Hyperplanning : toutes les notes sont remontées sur 20. */
export const DEFAULT_MAX_SCORE = 20;

/** Total des points d'une grille (`null` sans critère). Les bonus sont hors barème. */
export function criteriaTotal(
  criteria: readonly { weight: number; is_bonus?: boolean }[],
): number | null {
  const scored = criteria.filter((c) => !c.is_bonus);
  return scored.length ? scored.reduce((sum, c) => sum + c.weight, 0) : null;
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

/** Arrondi au demi-point supérieur (13,1 → 13,5 ; 13,5 → 13,5 ; 13,6 → 14), sans bruit de calcul. */
export function ceilHalf(n: number): number {
  return Math.ceil(Math.round(n * 2 * 1e6) / 1e6) / 2;
}

/**
 * Ramène une note sur 20 (ex. 15/30 → 10). Barème autre que 20 : arrondie au demi-point supérieur,
 * comme le fait Marie (décision d'Arnaud, 10 nov. 2026). Barème déjà sur 20 : note gardée telle
 * quelle (au centième). C'est cette note sur 20 qui sert aux moyennes et à Hyperplanning.
 */
export function toTwenty(value: number, max: number = DEFAULT_MAX_SCORE): number {
  if (!(max > 0)) return value;
  if (max === DEFAULT_MAX_SCORE) return round2(value);
  return ceilHalf((value * DEFAULT_MAX_SCORE) / max);
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

/**
 * Renvoie le nombre minimum de notes requises pour un module donné.
 * Pour un volume hors paliers (ex. 18 h, 50 h, 90 h), on retient le palier le
 * plus proche et `exact` vaut `false`.
 */
export function requiredNotes(
  totalHours: number,
  rules: GradingRules = YNOV_GRADING,
): NoteRequirement {
  const BRACKETS = rules.brackets.length ? rules.brackets : YNOV_BRACKETS;
  if (!Number.isFinite(totalHours) || totalHours <= 0) {
    return { total: 0, group: 0, individual: 0, exact: false };
  }

  const match = BRACKETS.find((b) => totalHours >= b.minHours && totalHours <= b.maxHours);
  if (match) {
    return {
      total: match.group + match.individual,
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
    total: nearest.group + nearest.individual,
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
export function weightedAverage(
  grades: readonly GradeInput[],
  rules: GradingRules = YNOV_GRADING,
): WeightedResult {
  let points = 0;
  let weight = 0;

  for (const g of grades) {
    const coef = coefficientFor(g.kind === "group", rules);
    points += toTwenty(g.value, g.max) * coef;
    weight += coef;
  }

  return {
    points,
    weight,
    average: weight === 0 ? null : points / weight,
  };
}

export interface BonusResult extends WeightedResult {
  /**
   * Points que le bonus ajoute à la moyenne (jamais négatif), ou `null` sans note bonus ou sans
   * autre note : alors la moyenne est celle des notes normales.
   */
  bonusEffect: number | null;
}

/**
 * Moyenne avec note(s) bonus (règle « jamais pénalisant ») : moyenne finale = le plus élevé de la
 * moyenne SANS le bonus et de la moyenne pondérée AVEC le bonus, puis plafond à 20. Une note bonus
 * basse ou une absence de certification ne baisse donc jamais la moyenne.
 */
export function averageWithBonus(
  regular: readonly GradeInput[],
  bonus: readonly GradeInput[],
  rules: GradingRules = YNOV_GRADING,
): BonusResult {
  const base = weightedAverage(regular, rules);
  if (base.average === null || bonus.length === 0 || !rules.bonusAllowed)
    return { ...base, bonusEffect: null };
  const withBonus = weightedAverage([...regular, ...bonus], rules);
  const better = (withBonus.average ?? 0) > base.average;
  const average = Math.min(20, better ? (withBonus.average ?? base.average) : base.average);
  return {
    points: better ? withBonus.points : base.points,
    weight: better ? withBonus.weight : base.weight,
    average,
    bonusEffect: Math.max(0, average - base.average),
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
  rules: GradingRules = YNOV_GRADING,
): NoteProgress {
  const requirement = requiredNotes(totalHours, rules);
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
