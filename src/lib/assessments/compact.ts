/**
 * US-140 : vue « tous les critères d'un coup ». Fonctions pures : palier moyen, raccourcis
 * clavier (chiffre = palier, ↑ ↓ = critère), commentaire par axe.
 */

/** Préfixe des commentaires d'axe dans `grade.criterion_comments` (aucune migration). */
export const AXIS_COMMENT_PREFIX = "axis:";

export const axisCommentKey = (axisId: string) => `${AXIS_COMMENT_PREFIX}${axisId}`;

export interface LevelLike {
  points: number;
}

/**
 * Palier « moyen » : celui du milieu quand on trie les paliers du plus haut au plus bas ; avec un
 * nombre pair, le plus haut des deux du milieu (4 paliers 6 / 4 / 2 / 0 → 4). `null` sans palier.
 */
export function middleLevel<L extends LevelLike>(levels: readonly L[]): L | null {
  if (levels.length === 0) return null;
  const sorted = [...levels].sort((a, b) => b.points - a.points);
  return sorted[Math.floor((sorted.length - 1) / 2)];
}

/** Touche chiffre → palier dont les points valent ce chiffre (« 4 » → palier de 4 points). */
export function levelForDigit<L extends LevelLike>(levels: readonly L[], key: string): L | null {
  if (!/^\d$/.test(key)) return null;
  const n = Number(key);
  return levels.find((l) => l.points === n) ?? null;
}

/** ↑ ↓ passent au critère précédent / suivant, sans boucle ; `null` pour une autre touche ou aux extrémités. */
export function moveCriterion(index: number, key: string, count: number): number | null {
  if (count <= 0) return null;
  if (key === "ArrowDown") return index + 1 < count ? index + 1 : null;
  if (key === "ArrowUp") return index > 0 ? index - 1 : null;
  return null;
}

/**
 * Critères à remplir par « Tout mettre au palier moyen » : ceux qui ont des paliers, ne sont ni
 * bonus ni validés d'office, et n'ont pas encore de note (on n'écrase jamais une note).
 */
export function criteriaToFillWithMiddle<
  C extends { id: string; is_bonus?: boolean | null; levels: readonly LevelLike[] },
>(
  criteria: readonly C[],
  inputs: Readonly<Record<string, string | undefined>>,
  autoValidatedIds: readonly string[] = [],
): { id: string; points: number }[] {
  return criteria.flatMap((c) => {
    if (c.is_bonus || autoValidatedIds.includes(c.id)) return [];
    if ((inputs[c.id] ?? "").trim() !== "") return [];
    const level = middleLevel(c.levels);
    return level ? [{ id: c.id, points: level.points }] : [];
  });
}

/** Commentaire d'un axe dans les commentaires enregistrés. */
export function axisComment(comments: Readonly<Record<string, string>>, axisId: string): string {
  return comments[axisCommentKey(axisId)] ?? "";
}
