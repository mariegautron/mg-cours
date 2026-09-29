/**
 * US-61 : réordonner les séances d'un module. Fonctions pures : l'ordre est une liste d'identifiants,
 * la position enregistrée est toujours renumérotée de 1 à N sans trou.
 */

export type MoveDirection = "up" | "down";

/** Échange la séance avec sa voisine ; renvoie la liste inchangée en bout de liste ou si inconnue. */
export function moveInOrder(ids: string[], id: string, direction: MoveDirection): string[] {
  const from = ids.indexOf(id);
  const to = direction === "up" ? from - 1 : from + 1;
  if (from === -1 || to < 0 || to >= ids.length) return ids;
  const next = [...ids];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

/** Positions 1..N dans l'ordre donné. */
export function renumber(ids: string[]): { id: string; position: number }[] {
  return ids.map((id, i) => ({ id, position: i + 1 }));
}

/** Position d'une nouvelle séance : après toutes les autres. */
export function nextPosition(positions: number[]): number {
  return positions.length === 0 ? 1 : Math.max(...positions, positions.length) + 1;
}
