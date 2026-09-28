import { z } from "zod";

/** Palier d'un critère : points attribués + description visible des étudiant·es. */
export interface LevelInput {
  points: number;
  description: string;
}

export const levelsSchema = z
  .array(
    z.object({
      points: z.number("Points invalides.").min(0, "Points invalides.").max(1000),
      description: z
        .string()
        .trim()
        .max(2000, "Description de palier trop longue (2 000 caractères max).")
        .default(""),
    }),
  )
  .max(20, "20 paliers maximum par critère.")
  .refine((levels) => new Set(levels.map((l) => l.points)).size === levels.length, {
    message: "Deux paliers d'un même critère ont les mêmes points.",
  })
  .refine((levels) => levels.length === 0 || Math.max(...levels.map((l) => l.points)) > 0, {
    message: "Le palier le plus haut doit valoir plus de 0 point.",
  });

/** Paliers du plus haut au plus bas (ordre d'affichage et de saisie). */
export function sortLevels<T extends { points: number }>(levels: readonly T[]): T[] {
  return [...levels].sort((a, b) => b.points - a.points);
}

/** Barème d'un critère à paliers = son palier le plus haut (`null` sans palier). */
export function levelsMax(levels: readonly { points: number }[]): number | null {
  return levels.length ? Math.max(...levels.map((l) => l.points)) : null;
}
