import { z } from "zod";

export interface CriterionInput {
  /** Absent (nouveau critère) ou identifiant existant. Un identifiant d'une autre grille est ignoré
   * (traité comme une création) : voir `diffCriteria`. */
  id?: string;
  label: string;
  weight: number;
  description: string;
}

export const criteriaInputSchema = z
  .array(
    z.object({
      id: z.string().uuid().optional(),
      label: z.string().trim().min(1, "Libellé manquant.").max(200),
      weight: z.number().positive("Points invalides.").max(1000),
      description: z
        .string()
        .trim()
        .max(4000, "Description trop longue (4 000 caractères max).")
        .default(""),
    }),
  )
  .min(1, "Ajoutez au moins un critère.");

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

export interface ExistingCriterion {
  id: string;
  label: string;
  weight: number;
  description: string | null;
}

export interface CriteriaDiff {
  toInsert: { label: string; weight: number; description: string | null; position: number }[];
  toUpdate: {
    id: string;
    label: string;
    weight: number;
    description: string | null;
    position: number;
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
    if (c.id && existingIds.has(c.id)) {
      matchedIds.add(c.id);
      toUpdate.push({ id: c.id, label: c.label, weight: c.weight, description, position });
    } else {
      toInsert.push({ label: c.label, weight: c.weight, description, position });
    }
  });

  const toDelete = existing.filter((c) => !matchedIds.has(c.id)).map((c) => c.id);
  return { toInsert, toUpdate, toDelete };
}
