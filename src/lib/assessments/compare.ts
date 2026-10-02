/**
 * US-141 : comparer un critère entre les copies. Fonctions pures : lecture des points et du
 * commentaire de chaque copie, répartition par palier, écarts (copie éloignée de la médiane, même
 * commentaire à des paliers différents), tri, commentaires qui reviennent.
 */
import { parseCriterionComments } from "./feedback";

export interface LevelOf {
  points: number;
}

export interface CompareCopy {
  id: string;
  title: string;
  /** `grade.scores` / `grade.criterion_comments` de la copie (ou rien si pas encore de ligne). */
  scores?: unknown;
  comments?: unknown;
  /** Copie sans note possible (absent·e) : exclue de la comparaison. */
  absent?: boolean;
}

export type GapFlag = "far_from_median" | "same_comment_other_level" | "no_comment";

export interface CompareRow {
  id: string;
  title: string;
  points: number | null;
  comment: string | null;
  absent: boolean;
  /** Écart, en nombre de paliers, avec le palier médian (`null` sans note). */
  steps: number | null;
  flags: GapFlag[];
}

export interface Comparison {
  rows: CompareRow[];
  /** Nombre de copies par palier (du plus haut au plus bas) et sans note. */
  counts: { points: number; count: number }[];
  unscored: number;
  /** Palier médian des copies notées (`null` si aucune). */
  median: number | null;
}

const EPSILON = 1e-9;

function pointsOf(scores: unknown, criterionId: string): number | null {
  if (!scores || typeof scores !== "object" || Array.isArray(scores)) return null;
  const v = (scores as Record<string, unknown>)[criterionId];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Paliers triés du plus haut au plus bas, sans doublon. */
export function sortedPoints(levels: readonly LevelOf[]): number[] {
  return [...new Set(levels.map((l) => l.points))].sort((a, b) => b - a);
}

/** Rang (0 = palier le plus haut) des points parmi les paliers ; le palier le plus proche si hors paliers. */
export function levelRank(levels: readonly LevelOf[], points: number): number {
  const ranks = sortedPoints(levels);
  let best = 0;
  let bestDelta = Infinity;
  ranks.forEach((p, i) => {
    const d = Math.abs(p - points);
    if (d < bestDelta - EPSILON) {
      best = i;
      bestDelta = d;
    }
  });
  return best;
}

const normalizeComment = (c: string) => c.trim().replace(/\s+/g, " ").toLowerCase();

export function compareCriterion(
  copies: readonly CompareCopy[],
  criterionId: string,
  levels: readonly LevelOf[],
  /** Au-delà de ce nombre de paliers d'écart avec la médiane, une copie est signalée. */
  farSteps = 2,
): Comparison {
  const base = copies.map((c) => ({
    id: c.id,
    title: c.title,
    absent: !!c.absent,
    points: c.absent ? null : pointsOf(c.scores, criterionId),
    comment: parseCriterionComments(c.comments)[criterionId]?.trim() || null,
  }));
  const scored = base.filter((r) => r.points !== null);
  const ranks = scored.map((r) => levelRank(levels, r.points as number)).sort((a, b) => a - b);
  const medianRank = ranks.length ? ranks[Math.floor((ranks.length - 1) / 2)] : null;
  const ladder = sortedPoints(levels);
  const median = medianRank === null ? null : (ladder[medianRank] ?? null);

  // Même commentaire (à la casse et aux espaces près) donné à des paliers différents.
  const levelsByComment = new Map<string, Set<number>>();
  for (const r of scored) {
    if (!r.comment) continue;
    const key = normalizeComment(r.comment);
    const set = levelsByComment.get(key) ?? new Set<number>();
    set.add(levelRank(levels, r.points as number));
    levelsByComment.set(key, set);
  }

  const rows = base.map((r): CompareRow => {
    const flags: GapFlag[] = [];
    let steps: number | null = null;
    if (r.points !== null && medianRank !== null) {
      steps = levelRank(levels, r.points) - medianRank;
      if (Math.abs(steps) >= farSteps) flags.push("far_from_median");
      if (r.comment && (levelsByComment.get(normalizeComment(r.comment))?.size ?? 0) > 1) {
        flags.push("same_comment_other_level");
      }
      if (!r.comment) flags.push("no_comment");
    }
    return { ...r, steps, flags };
  });

  return {
    rows,
    counts: ladder.map((p) => ({
      points: p,
      count: scored.filter((r) => Math.abs((r.points as number) - p) < EPSILON).length,
    })),
    unscored: base.filter((r) => r.points === null && !r.absent).length,
    median,
  };
}

export type CompareSort = "name" | "points_desc" | "points_asc" | "gap";

/** Tri des lignes ; les copies sans note viennent toujours à la fin, les absent·es après. */
export function sortCompareRows(rows: readonly CompareRow[], mode: CompareSort): CompareRow[] {
  const bucket = (r: CompareRow) => (r.absent ? 2 : r.points === null ? 1 : 0);
  const byName = (a: CompareRow, b: CompareRow) => a.title.localeCompare(b.title, "fr");
  return [...rows].sort((a, b) => {
    if (bucket(a) !== bucket(b)) return bucket(a) - bucket(b);
    if (bucket(a) !== 0 || mode === "name") return byName(a, b);
    if (mode === "points_desc") return (b.points as number) - (a.points as number) || byName(a, b);
    if (mode === "points_asc") return (a.points as number) - (b.points as number) || byName(a, b);
    // « gap » : l'écart le plus grand avec la médiane d'abord, puis les copies signalées.
    return (
      Math.abs(b.steps ?? 0) - Math.abs(a.steps ?? 0) ||
      b.flags.length - a.flags.length ||
      byName(a, b)
    );
  });
}

/** Commentaires donnés à au moins `min` copies : de quoi harmoniser les mêmes remarques. */
export function repeatedComments(
  rows: readonly CompareRow[],
  min = 2,
): { comment: string; titles: string[] }[] {
  const groups = new Map<string, { comment: string; titles: string[] }>();
  for (const r of rows) {
    if (!r.comment || r.absent) continue;
    const key = normalizeComment(r.comment);
    const g = groups.get(key) ?? { comment: r.comment, titles: [] };
    g.titles.push(r.title);
    groups.set(key, g);
  }
  return [...groups.values()]
    .filter((g) => g.titles.length >= min)
    .sort((a, b) => b.titles.length - a.titles.length || a.comment.localeCompare(b.comment, "fr"));
}

export const GAP_LABELS: Record<GapFlag, string> = {
  far_from_median: "Loin du palier médian",
  same_comment_other_level: "Même commentaire, autre palier",
  no_comment: "Pas de commentaire",
};

/** Touche « 1 » à « 9 » → palier, du plus haut au plus bas (comme la maquette). */
export function pointsForRankKey(levels: readonly LevelOf[], key: string): number | null {
  if (!/^[1-9]$/.test(key)) return null;
  return sortedPoints(levels)[Number(key) - 1] ?? null;
}
