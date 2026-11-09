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

/**
 * Noms projetés « Prénom + initiale » ; quand deux personnes ont le même prénom et la même
 * initiale, l'initiale s'allonge jusqu'à ce qu'elles diffèrent (« Maxence Pa. », « Maxence Pe. »).
 */
export function projectedNames(
  people: { id: string; first_name: string; last_name: string }[],
): Map<string, string> {
  const result = new Map<string, string>();
  const key = (s: string) => s.trim().toLocaleLowerCase("fr");
  for (const p of people) {
    const last = p.last_name.trim();
    const twins = people.filter((o) => o.id !== p.id && key(o.first_name) === key(p.first_name));
    let n = 1;
    while (
      n < last.length &&
      twins.some((o) => key(o.last_name.trim().slice(0, n)) === key(last.slice(0, n)))
    ) {
      n++;
    }
    const short = last.slice(0, n);
    result.set(p.id, `${p.first_name.trim()} ${short}${short.length < last.length ? "." : ""}`);
  }
  return result;
}
