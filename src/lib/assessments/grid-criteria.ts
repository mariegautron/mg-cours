import { z } from "zod";

import { levelsMax, levelsSchema, sortLevels, type LevelInput } from "@/lib/assessments/levels";

export interface CriterionInput {
  /** Absent (nouveau critère) ou identifiant existant. Un identifiant d'une autre grille est ignoré
   * (traité comme une création) : voir `diffCriteria`. */
  id?: string;
  label: string;
  weight: number;
  description: string;
  /** Paliers (points + description). Vide : saisie numérique libre. Avec paliers, `weight` = palier le plus haut. */
  levels?: LevelInput[];
  /** Clé de l'axe (`AxisInput.key`) ou absente : critère sans axe. */
  axisKey?: string | null;
  /** Référence libre (ex. « RGAA 1.3.1 »). */
  reference?: string;
  /** Bonus : hors barème, jamais compté dans le dénominateur. */
  isBonus?: boolean;
}

export const criteriaInputSchema = z
  .array(
    z
      .object({
        id: z.string().uuid().optional(),
        label: z.string().trim().min(1, "Libellé manquant.").max(200),
        weight: z.number().positive("Points invalides.").max(1000),
        description: z
          .string()
          .trim()
          .max(4000, "Description trop longue (4 000 caractères max).")
          .default(""),
        levels: levelsSchema.default([]),
        axisKey: z
          .string()
          .min(1)
          .nullish()
          .transform((v) => v ?? null),
        reference: z
          .string()
          .trim()
          .max(200, "Référence trop longue (200 caractères max).")
          .default(""),
        isBonus: z.boolean().default(false),
      })
      .transform((c) => {
        const max = levelsMax(c.levels);
        return {
          ...c,
          weight: max ?? c.weight,
          levels: sortLevels(c.levels),
        };
      }),
  )
  .min(1, "Ajoute au moins un critère.");

/** Lit le JSON envoyé par l'éditeur de liste (`criteriaJson`) et le valide. */
export function readCriteriaInput(raw: string): { criteria: CriterionInput[] } | { error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "Critères invalides." };
  }
  const result = criteriaInputSchema.safeParse(parsed);
  if (!result.success) return { error: result.error.issues[0]?.message ?? "Critères invalides." };
  return { criteria: result.data };
}

export interface AxisInput {
  /** Clé stable côté éditeur : un nouvel axe n'a pas encore d'identifiant. */
  key: string;
  id?: string;
  label: string;
}

const axesInputSchema = z
  .array(
    z.object({
      key: z.string().min(1),
      id: z.string().uuid().optional(),
      label: z.string().trim().min(1, "Nom d'axe manquant.").max(200),
    }),
  )
  .max(30, "30 axes maximum.");

/** Lit le JSON des axes (`axesJson`) ; une chaîne vide vaut « aucun axe ». */
export function readAxesInput(raw: string): { axes: AxisInput[] } | { error: string } {
  if (!raw.trim()) return { axes: [] };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "Axes invalides." };
  }
  const result = axesInputSchema.safeParse(parsed);
  if (!result.success) return { error: result.error.issues[0]?.message ?? "Axes invalides." };
  return { axes: result.data };
}

export interface AxesDiff {
  toInsert: { key: string; label: string; position: number }[];
  toUpdate: { key: string; id: string; label: string; position: number }[];
  toDelete: string[];
}

/** Même logique que `diffCriteria` : un identifiant d'une autre grille est traité comme une création. */
export function diffAxes(
  existing: readonly { id: string }[],
  submitted: readonly AxisInput[],
): AxesDiff {
  const existingIds = new Set(existing.map((a) => a.id));
  const toInsert: AxesDiff["toInsert"] = [];
  const toUpdate: AxesDiff["toUpdate"] = [];
  const matched = new Set<string>();
  submitted.forEach((a, position) => {
    if (a.id && existingIds.has(a.id)) {
      matched.add(a.id);
      toUpdate.push({ key: a.key, id: a.id, label: a.label, position });
    } else {
      toInsert.push({ key: a.key, label: a.label, position });
    }
  });
  return {
    toInsert,
    toUpdate,
    toDelete: existing.filter((a) => !matched.has(a.id)).map((a) => a.id),
  };
}

export interface ExistingCriterion {
  id: string;
  label: string;
  weight: number;
  description: string | null;
}

export interface CriteriaDiff {
  toInsert: {
    label: string;
    weight: number;
    description: string | null;
    position: number;
    levels: LevelInput[];
    axisKey: string | null;
    reference: string | null;
    isBonus: boolean;
  }[];
  toUpdate: {
    id: string;
    label: string;
    weight: number;
    description: string | null;
    position: number;
    levels: LevelInput[];
    axisKey: string | null;
    reference: string | null;
    isBonus: boolean;
  }[];
  /** Identifiants de critères existants absents de la liste soumise. */
  toDelete: string[];
}

/**
 * Compare les critères existants d'une grille à ceux soumis par le formulaire (dans l'ordre
 * affiché → `position` = index). Un critère soumis avec un `id` qui n'appartient pas à cette
 * grille (ex. copié depuis une autre) est traité comme une création, pas une modification.
 */
export function diffCriteria(
  existing: readonly ExistingCriterion[],
  submitted: readonly CriterionInput[],
): CriteriaDiff {
  const existingIds = new Set(existing.map((c) => c.id));
  const toInsert: CriteriaDiff["toInsert"] = [];
  const toUpdate: CriteriaDiff["toUpdate"] = [];
  const matchedIds = new Set<string>();

  submitted.forEach((c, position) => {
    const description = c.description || null;
    const levels = c.levels ?? [];
    const extra = {
      levels,
      axisKey: c.axisKey ?? null,
      reference: c.reference || null,
      isBonus: c.isBonus ?? false,
    };
    if (c.id && existingIds.has(c.id)) {
      matchedIds.add(c.id);
      toUpdate.push({
        id: c.id,
        label: c.label,
        weight: c.weight,
        description,
        position,
        ...extra,
      });
    } else {
      toInsert.push({ label: c.label, weight: c.weight, description, position, ...extra });
    }
  });

  const toDelete = existing.filter((c) => !matchedIds.has(c.id)).map((c) => c.id);
  return { toInsert, toUpdate, toDelete };
}
