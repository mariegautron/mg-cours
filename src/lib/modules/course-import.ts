import type { Tables } from "@/types/db";

import { nextPosition } from "./reorder";

/**
 * US-58 : importer des séances d'un autre module. On reprend le contenu pédagogique (titre,
 * modalité, objectifs, notes, liens vers les ressources) ; jamais ce qui est propre au déroulé
 * réel (dates, horaires, statut de préparation, clôture et carnet, observations). Fonctions pures.
 */

export type CourseType = Tables<"course">["type"];

export interface ImportableCourse {
  id: string;
  title: string;
  type: CourseType;
  position: number;
  learning_objectives: string[];
  animation_notes: string | null;
  assessment_notes: string | null;
  material: string | null;
  resourceLinks: { resource_id: string; role: "primary" | "secondary" }[];
}

/** Séance à créer dans le module cible. */
export interface CourseImportRow {
  title: string;
  type: CourseType;
  position: number;
  learning_objectives: string[];
  animation_notes: string | null;
  assessment_notes: string | null;
  material: string | null;
  /** Une séance importée est à préparer : jamais « prête » d'office. */
  prep_status: "todo";
  resourceLinks: { resource_id: string; role: "primary" | "secondary" }[];
}

/** Ce qui n'est pas repris, affiché dans l'aperçu. */
export const NOT_IMPORTED_LABEL =
  "dates, horaires, statut de préparation, clôture de séance, carnet et observations";

/**
 * Séances à créer : celles cochées, dans l'ordre du module source, numérotées à la suite des
 * séances déjà présentes dans le module cible.
 */
export function planCourseImport(
  source: ImportableCourse[],
  selectedIds: string[],
  existingPositions: number[],
): CourseImportRow[] {
  const selected = new Set(selectedIds);
  const start = nextPosition(existingPositions);
  return source
    .filter((c) => selected.has(c.id))
    .toSorted((a, b) => a.position - b.position)
    .map((c, i) => ({
      title: c.title,
      type: c.type,
      position: start + i,
      learning_objectives: [...c.learning_objectives],
      animation_notes: c.animation_notes,
      assessment_notes: c.assessment_notes,
      material: c.material,
      prep_status: "todo" as const,
      resourceLinks: c.resourceLinks.map((l) => ({ ...l })),
    }));
}

/** « 2 objectifs · notes · 3 ressources » : ce qui sera repris pour une séance. */
export function describeImportedContent(
  c: Pick<
    ImportableCourse,
    "learning_objectives" | "animation_notes" | "assessment_notes" | "material" | "resourceLinks"
  >,
): string {
  const parts: string[] = [];
  const objectives = c.learning_objectives.length;
  if (objectives) parts.push(`${objectives} objectif${objectives > 1 ? "s" : ""}`);
  if (c.animation_notes?.trim() || c.assessment_notes?.trim() || c.material?.trim()) {
    parts.push("notes");
  }
  const resources = c.resourceLinks.length;
  if (resources) parts.push(`${resources} ressource${resources > 1 ? "s" : ""}`);
  return parts.length ? parts.join(" · ") : "titre et modalité seulement";
}

/** « 3 séances seront ajoutées à la suite des 4 existantes (séances 5 à 7). » */
export function describeImportPlan(count: number, existing: number): string {
  if (count === 0) return "Coche au moins une séance à importer.";
  const range =
    count > 1 ? `séances ${existing + 1} à ${existing + count}` : `séance ${existing + 1}`;
  const after = existing ? ` à la suite des ${existing} existante${existing > 1 ? "s" : ""}` : "";
  return `${count} séance${count > 1 ? "s seront ajoutées" : " sera ajoutée"}${after} (${range}).`;
}
