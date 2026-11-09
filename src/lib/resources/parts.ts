/**
 * Morceaux de cours (« Estimation des tâches — Planning poker ») : importés de Notion le 4 octobre
 * 2026, chacun copie une partie d'un cours. Dans les listes, ils sont rangés sous leur cours au lieu
 * d'apparaître à égalité. Fonctions pures.
 */

const PART_TITLE = /^(.+?)\s+[—–]\s+(.+)$/;

/** Cours parent et nom de la partie, si le titre a la forme « Cours — partie ». */
export function partTitle(title: string): { parent: string; part: string } | null {
  const m = PART_TITLE.exec(title.trim());
  return m ? { parent: m[1].trim(), part: m[2].trim() } : null;
}

export interface Nested<T> {
  item: T;
  /** Morceaux rangés sous ce cours (vide pour une ressource ordinaire). */
  parts: T[];
}

/**
 * Range chaque morceau sous son cours quand ce cours est dans la liste ; sinon le morceau reste à
 * sa place. L'ordre de la liste est gardé.
 */
export function nestParts<T extends { id: string; title: string }>(
  items: readonly T[],
): Nested<T>[] {
  const byTitle = new Map(items.map((i) => [i.title.trim(), i]));
  const partsOf = new Map<string, T[]>();
  const nestedIds = new Set<string>();
  for (const item of items) {
    const p = partTitle(item.title);
    const parent = p ? byTitle.get(p.parent) : undefined;
    if (!parent || parent.id === item.id || partTitle(parent.title)) continue;
    partsOf.set(parent.id, [...(partsOf.get(parent.id) ?? []), item]);
    nestedIds.add(item.id);
  }
  return items
    .filter((i) => !nestedIds.has(i.id))
    .map((item) => ({ item, parts: partsOf.get(item.id) ?? [] }));
}
