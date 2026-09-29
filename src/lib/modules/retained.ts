/**
 * US-55 : ressources retenues pour un module. Fonctions pures pour proposer d'abord les
 * ressources retenues quand on lie des ressources à une séance.
 */

export interface RetainedSplit<T> {
  /** Ressources retenues du module, dans l'ordre reçu. */
  retained: T[];
  /** Toutes les autres. */
  others: T[];
}

export function splitRetained<T extends { id: string }>(
  resources: T[],
  retainedIds: ReadonlySet<string>,
): RetainedSplit<T> {
  const retained: T[] = [];
  const others: T[] = [];
  for (const r of resources) (retainedIds.has(r.id) ? retained : others).push(r);
  return { retained, others };
}
