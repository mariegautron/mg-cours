import { plainDescription } from "@/lib/assessments/expectations";
import { groupByAxis } from "@/lib/assessments/scoring";
import { criteriaTotal, effectiveMaxScore } from "@/lib/ynov/notation";

/**
 * Grille remise aux étudiant·es (US-91) : axes, critères, paliers et descriptions, références,
 * bonus. Structure volontairement sans note, sans commentaire et sans critère « validé d'office » :
 * tout ce qui vient d'une correction reste hors de ce type.
 */
export interface HandoutLevel {
  points: number;
  description: string;
}

export interface HandoutCriterion {
  label: string;
  description: string | null;
  reference: string | null;
  isBonus: boolean;
  max: number;
  /** Du plus haut au plus bas ; vide : saisie numérique libre. */
  levels: HandoutLevel[];
}

export interface HandoutAxis {
  /** `null` : critères sans axe (titre affiché seulement si la grille a des axes). */
  label: string | null;
  criteria: HandoutCriterion[];
  /** Total des critères de l'axe hors bonus. */
  max: number;
  /** Total des bonus de l'axe. */
  bonusMax: number;
}

export interface GridHandout {
  gridName: string;
  description: string | null;
  /** Contexte de l'évaluation, absent quand la grille est exportée seule. */
  context: {
    assessmentTitle: string;
    moduleName: string;
    date: string | null;
    durationMinutes: number | null;
  } | null;
  hasAxes: boolean;
  axes: HandoutAxis[];
  /** Barème de la note (saisi sur l'évaluation, sinon total de la grille, sinon 20). */
  maxScore: number;
  bonusMax: number;
}

interface GridInput {
  name: string;
  description: string | null;
  criteria: {
    label: string;
    description: string | null;
    reference: string | null;
    weight: number;
    is_bonus: boolean;
    axis_id: string | null;
    position: number;
    levels: { points: number; description: string | null }[];
  }[];
  axes: { id: string; label: string; position: number }[];
}

const clean = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);

export function buildGridHandout(
  grid: GridInput,
  context: {
    assessmentTitle: string;
    moduleName: string;
    date: string | null;
    durationMinutes: number | null;
    maxScore: number | null;
  } | null = null,
): GridHandout {
  const axes = [...grid.axes].sort((a, b) => a.position - b.position);
  const criteria = [...grid.criteria].sort((a, b) => a.position - b.position);

  const groups = groupByAxis(criteria, axes).map((g): HandoutAxis => {
    const handoutCriteria = g.criteria.map((c): HandoutCriterion => ({
      label: c.label,
      description: clean(plainDescription(c.description)),
      reference: clean(c.reference),
      isBonus: c.is_bonus,
      max: c.weight,
      levels: [...c.levels]
        .sort((a, b) => b.points - a.points)
        .map((l) => ({ points: l.points, description: clean(l.description) ?? "" })),
    }));
    return {
      label: g.axis?.label ?? null,
      criteria: handoutCriteria,
      max: handoutCriteria.filter((c) => !c.isBonus).reduce((s, c) => s + c.max, 0),
      bonusMax: handoutCriteria.filter((c) => c.isBonus).reduce((s, c) => s + c.max, 0),
    };
  });

  return {
    gridName: grid.name,
    description: clean(grid.description),
    context: context
      ? {
          assessmentTitle: context.assessmentTitle,
          moduleName: context.moduleName,
          date: context.date,
          durationMinutes: context.durationMinutes,
        }
      : null,
    hasAxes: axes.length > 0,
    axes: groups,
    maxScore: effectiveMaxScore(context?.maxScore, criteriaTotal(criteria)),
    bonusMax: groups.reduce((s, g) => s + g.bonusMax, 0),
  };
}
