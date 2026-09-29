import { effectiveMaxScore, scaleGridTotal, toTwenty } from "@/lib/ynov/notation";

export interface ScoringCriterion {
  id: string;
  /** Points du critère (palier le plus haut). Pour un bonus : points de bonus. */
  weight: number;
  axisId?: string | null;
  /** Hors barème : compte dans la note mais jamais dans le dénominateur. */
  isBonus?: boolean;
}

export interface AxisSubtotal {
  /** `null` : critères sans axe. */
  axisId: string | null;
  /** Points obtenus hors bonus, sur `max`. */
  points: number;
  max: number;
  /** Bonus obtenu, sur `bonusMax`. */
  bonusPoints: number;
  bonusMax: number;
}

export interface GradeTotals {
  /** Points obtenus hors bonus. */
  base: number;
  /** Bonus obtenu. */
  bonus: number;
  /** Barème de la grille (hors bonus). */
  max: number;
  axes: AxisSubtotal[];
  /** Note sur le barème de l'évaluation, plafonnée à ce barème. */
  value: number;
  /** Note sur le barème de l'évaluation avant plafonnement. */
  rawValue: number;
  /** Barème effectif de l'évaluation. */
  maxScore: number;
  /** `true` si le bonus (ou un dépassement) a été plafonné. */
  capped: boolean;
  /** Note ramenée sur 20 avant plafonnement (pour afficher « 21,5 → plafonné à 20 »). */
  rawOn20: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Points retenus pour un critère : son barème s'il est validé d'office (jamais pour un bonus),
 * sinon la saisie bornée à [0, barème] (une saisie absente vaut 0).
 */
export function effectivePoints(
  criterion: ScoringCriterion,
  scores: Readonly<Record<string, number | null | undefined>>,
  autoValidatedIds: readonly string[] = [],
): number {
  if (!criterion.isBonus && autoValidatedIds.includes(criterion.id)) return criterion.weight;
  const raw = scores[criterion.id];
  if (typeof raw !== "number" || !Number.isFinite(raw)) return 0;
  return Math.min(Math.max(raw, 0), criterion.weight);
}

/**
 * Total d'une note : sous-totaux par axe, bonus hors barème, critères validés d'office.
 * Règle (Marie) : le total, bonus inclus, est ramené au barème de l'évaluation puis PLAFONNÉ à ce
 * barème — le bonus compense, il ne fait jamais dépasser 20.
 */
export function computeTotals(
  criteria: readonly ScoringCriterion[],
  scores: Readonly<Record<string, number | null | undefined>>,
  options: { autoValidatedIds?: readonly string[]; maxScore?: number | null } = {},
): GradeTotals {
  const axes = new Map<string | null, AxisSubtotal>();
  let base = 0;
  let bonus = 0;
  let max = 0;

  for (const c of criteria) {
    const key = c.axisId ?? null;
    let axis = axes.get(key);
    if (!axis) {
      axis = { axisId: key, points: 0, max: 0, bonusPoints: 0, bonusMax: 0 };
      axes.set(key, axis);
    }
    const points = effectivePoints(c, scores, options.autoValidatedIds);
    if (c.isBonus) {
      axis.bonusPoints += points;
      axis.bonusMax += c.weight;
      bonus += points;
    } else {
      axis.points += points;
      axis.max += c.weight;
      base += points;
      max += c.weight;
    }
  }

  const maxScore = effectiveMaxScore(options.maxScore, max > 0 ? max : null);
  const rawValue =
    max > 0 ? scaleGridTotal(round2(base + bonus), max, options.maxScore ?? null) : 0;
  const value = Math.min(rawValue, maxScore);

  return {
    base: round2(base),
    bonus: round2(bonus),
    max,
    axes: [...axes.values()].map((a) => ({
      ...a,
      points: round2(a.points),
      bonusPoints: round2(a.bonusPoints),
    })),
    value: round2(value),
    rawValue: round2(rawValue),
    maxScore,
    capped: rawValue > maxScore,
    rawOn20: toTwenty(rawValue, maxScore),
  };
}

/**
 * Lit les saisies `score_<id>` d'un formulaire de note. Les identifiants inconnus de la grille, les
 * champs vides (critère pas encore noté) et les valeurs non numériques sont ignorés ; les points
 * sont bornés à [0, barème du critère].
 */
export function readScores(
  entries: Iterable<[string, FormDataEntryValue]>,
  criteria: readonly ScoringCriterion[],
): Record<string, number> {
  const byId = new Map(criteria.map((c) => [c.id, c]));
  const scores: Record<string, number> = {};
  for (const [key, raw] of entries) {
    if (!key.startsWith("score_") || typeof raw !== "string" || raw.trim() === "") continue;
    const criterion = byId.get(key.slice("score_".length));
    const num = Number(raw.replace(",", "."));
    if (!criterion || !Number.isFinite(num)) continue;
    scores[criterion.id] = Math.min(Math.max(num, 0), criterion.weight);
  }
  return scores;
}

/**
 * Une copie est « corrigée » dès qu'au moins un critère a été noté. Exception : si tous les critères
 * notés sont validés d'office, il n'y a rien à saisir et la copie compte comme corrigée. Sans cela, une
 * copie vierge (ou avec seulement des commentaires) recevrait un 0 qui fausserait les moyennes.
 */
export function hasScoredInput(
  criteria: readonly ScoringCriterion[],
  scores: Readonly<Record<string, number | null | undefined>>,
  autoValidatedIds: readonly string[] = [],
): boolean {
  if (Object.values(scores).some((v) => typeof v === "number" && Number.isFinite(v))) return true;
  const scored = criteria.filter((c) => !c.isBonus);
  return scored.length > 0 && scored.every((c) => autoValidatedIds.includes(c.id));
}

export interface AxisGroup<T, A> {
  /** `null` : critères sans axe (toujours après les axes). */
  axis: A | null;
  criteria: T[];
}

/**
 * Regroupe les critères par axe, dans l'ordre des axes puis des critères. Un critère dont l'axe est
 * inconnu (supprimé) est rangé avec les critères sans axe. Les axes sans critère sont omis.
 */
export function groupByAxis<T extends { axis_id?: string | null }, A extends { id: string }>(
  criteria: readonly T[],
  axes: readonly A[],
): AxisGroup<T, A>[] {
  const groups: AxisGroup<T, A>[] = axes.map((axis) => ({
    axis,
    criteria: criteria.filter((c) => c.axis_id === axis.id),
  }));
  const known = new Set(axes.map((a) => a.id));
  const loose = criteria.filter((c) => !c.axis_id || !known.has(c.axis_id));
  if (loose.length) groups.push({ axis: null, criteria: loose });
  return groups.filter((g) => g.criteria.length > 0);
}

/** Nombre au format français, sans zéros inutiles (« 21,5 », « 20 »). */
export function formatNumber(n: number): string {
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}

/** « 21,5 → plafonné à 20 » si le total dépasse 20 avant plafonnement, sinon la note seule. */
export function describeOverflow(totals: Pick<GradeTotals, "capped" | "rawOn20">): string | null {
  return totals.capped ? `${formatNumber(totals.rawOn20)} → plafonné à 20` : null;
}
