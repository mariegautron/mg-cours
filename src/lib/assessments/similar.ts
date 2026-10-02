/**
 * US-139 : « Déjà noté chez les autres ». Pour un critère, ce que les autres copies de la classe
 * ont reçu au même palier, avec leur commentaire, à reprendre en un clic. Fonctions pures.
 */
import { parseCriterionComments } from "./feedback";

export interface OtherCopy {
  id: string;
  title: string;
  /** Points par critère (`grade.scores`). */
  scores: unknown;
  /** Commentaire par critère (`grade.criterion_comments`). */
  comments: unknown;
}

export interface SimilarEntry {
  copyId: string;
  title: string;
  points: number;
  /** Commentaire donné à ce critère dans cette copie, s'il y en a un. */
  comment: string | null;
}

const EPSILON = 1e-9;

function pointsFor(scores: unknown, criterionId: string): number | null {
  if (!scores || typeof scores !== "object" || Array.isArray(scores)) return null;
  const v = (scores as Record<string, unknown>)[criterionId];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Valeur saisie (« 4 », « 3,5 ») → nombre ; `null` si vide ou illisible. */
export function parsePoints(input: string | null | undefined): number | null {
  const t = (input ?? "").trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * Copies qui ont reçu les mêmes points (le même palier) à ce critère, celles qui ont un
 * commentaire d'abord, puis par titre ; au plus `limit`. `currentId` est exclue. Sans palier choisi
 * (`points` nul), rien n'est proposé : la comparaison n'a pas de sens.
 */
export function similarAtSameLevel(args: {
  criterionId: string;
  points: number | null;
  others: readonly OtherCopy[];
  currentId?: string;
  limit?: number;
}): SimilarEntry[] {
  const { criterionId, points, others, currentId, limit = 3 } = args;
  if (points === null) return [];
  return others
    .filter((o) => o.id !== currentId)
    .flatMap((o): SimilarEntry[] => {
      const p = pointsFor(o.scores, criterionId);
      if (p === null || Math.abs(p - points) > EPSILON) return [];
      return [
        {
          copyId: o.id,
          title: o.title,
          points: p,
          comment: parseCriterionComments(o.comments)[criterionId]?.trim() || null,
        },
      ];
    })
    .sort(
      (a, b) =>
        Number(b.comment !== null) - Number(a.comment !== null) ||
        a.title.localeCompare(b.title, "fr"),
    )
    .slice(0, limit);
}

/** Libellé de l'entrée : « Groupe 4 · 4 pts · « Choix non justifiés. » ». */
export function similarLabel(entry: SimilarEntry): string {
  const pts = `${entry.points.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} pt${entry.points > 1 ? "s" : ""}`;
  return `${entry.title} · ${pts}${entry.comment ? ` · « ${entry.comment} »` : " · sans commentaire"}`;
}

/** Commentaire après « Même palier et commentaire » : celui d'en face, sans écraser un texte déjà écrit. */
export function adoptComment(
  current: string,
  entry: SimilarEntry,
): { comment: string; changed: boolean } {
  if (!entry.comment) return { comment: current, changed: false };
  const existing = current.trim();
  if (!existing) return { comment: entry.comment, changed: true };
  if (existing.includes(entry.comment)) return { comment: current, changed: false };
  return { comment: `${existing}\n${entry.comment}`, changed: true };
}
