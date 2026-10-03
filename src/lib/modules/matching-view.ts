/**
 * Écran « Rapprocher les ressources » : liste des attendus à gauche, un attendu ouvert à droite.
 * Fonctions pures : filtre, attendu ouvert par défaut, segments de la barre de couverture.
 */
import type { CoverageState, CoverageSummary } from "./matching";

export type MatchingFilter = "all" | CoverageState;

export const MATCHING_FILTERS: { key: MatchingFilter; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "uncovered", label: "Sans ressource" },
  { key: "to_build", label: "À construire" },
  { key: "covered", label: "Couverts" },
];

export function parseMatchingFilter(value: string | undefined): MatchingFilter {
  return MATCHING_FILTERS.some((f) => f.key === value) ? (value as MatchingFilter) : "all";
}

export function filterByState<T extends { state: CoverageState }>(
  rows: T[],
  filter: MatchingFilter,
): T[] {
  return filter === "all" ? rows : rows.filter((r) => r.state === filter);
}

/** Nombre d'attendus par filtre, pour les compteurs des pastilles. */
export function filterCounts(states: CoverageState[]): Record<MatchingFilter, number> {
  return {
    all: states.length,
    uncovered: states.filter((s) => s === "uncovered").length,
    to_build: states.filter((s) => s === "to_build").length,
    covered: states.filter((s) => s === "covered").length,
  };
}

/**
 * Attendu ouvert : celui demandé s'il existe, sinon le premier qui n'est pas couvert (c'est lui
 * qui demande du travail), sinon le premier. `null` quand il n'y a aucun attendu.
 */
export function selectedExpectationId<T extends { id: string; state: CoverageState }>(
  rows: T[],
  requested: string | undefined,
): string | null {
  if (!rows.length) return null;
  const asked = rows.find((r) => r.id === requested);
  if (asked) return asked.id;
  return (rows.find((r) => r.state !== "covered") ?? rows[0]).id;
}

export interface CoverageSegments {
  covered: number;
  toBuild: number;
}

/** Largeurs (en %) des segments de la barre : couverts puis à construire ; le reste est « sans ressource ». */
export function coverageSegments(s: CoverageSummary): CoverageSegments {
  if (s.total <= 0) return { covered: 0, toBuild: 0 };
  const pct = (n: number) => Math.round((n / s.total) * 1000) / 10;
  return { covered: pct(s.covered), toBuild: pct(s.toBuild) };
}
