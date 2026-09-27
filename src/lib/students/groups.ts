/** Année scolaire d'un module : `year` = année de rentrée (2025 → « 2025-26 »). */
export function schoolYearLabel(year: number): string {
  return `${year}-${String((year + 1) % 100).padStart(2, "0")}`;
}

interface GroupWithModule {
  id: string;
  name: string;
  module: { id: string; name: string; year: number } | null;
}

export interface SchoolYearGroups<G extends GroupWithModule> {
  /** `null` : groupes sans module rattaché. */
  year: number | null;
  label: string;
  groups: (G & { display: string })[];
}

/**
 * Groupes d'un·e étudiant·e rangés par année scolaire, la plus récente en premier ; dans une
 * année, par module puis par nom de groupe. Libellé : « Groupe · Module · 2025-26 ».
 */
export function groupsBySchoolYear<G extends GroupWithModule>(groups: G[]): SchoolYearGroups<G>[] {
  const byYear = new Map<number | null, G[]>();
  for (const g of groups) {
    const year = g.module?.year ?? null;
    byYear.set(year, [...(byYear.get(year) ?? []), g]);
  }
  return [...byYear.entries()]
    .sort(([a], [b]) => (a === null ? 1 : b === null ? -1 : b - a))
    .map(([year, list]) => ({
      year,
      label: year === null ? "Sans module" : schoolYearLabel(year),
      groups: list
        .sort(
          (a, b) =>
            (a.module?.name ?? "").localeCompare(b.module?.name ?? "", "fr") ||
            a.name.localeCompare(b.name, "fr", { numeric: true }),
        )
        .map((g) => ({
          ...g,
          display: g.module
            ? `${g.name} · ${g.module.name} · ${schoolYearLabel(g.module.year)}`
            : g.name,
        })),
    }));
}
