/**
 * US-156 : questions liées à une ressource. Fonctions pures (écarts de sélection, étiquettes).
 */

export interface LinkDiff {
  add: string[];
  remove: string[];
}

/** Ce qu'il faut ajouter et retirer pour passer de `current` à `next` (doublons ignorés). */
export function diffLinks(current: readonly string[], next: readonly string[]): LinkDiff {
  const cur = new Set(current);
  const nxt = new Set(next);
  return {
    add: [...nxt].filter((id) => !cur.has(id)),
    remove: [...cur].filter((id) => !nxt.has(id)),
  };
}

/** Garde les seuls identifiants connus (on ne lie jamais une ressource ou une question qui n'existe pas). */
export function keepKnown(ids: readonly string[], known: ReadonlySet<string>): string[] {
  return [...new Set(ids)].filter((id) => known.has(id));
}

export function linkedQuestionsTitle(count: number): string {
  return `Questions liées (${count})`;
}

/** « Ressource d'origine : A » / « Ressources d'origine : A, B » ; vide sans lien. */
export function originLabel(titles: readonly string[]): string {
  if (titles.length === 0) return "";
  return `${titles.length > 1 ? "Ressources d’origine" : "Ressource d’origine"} : ${titles.join(", ")}`;
}

/** Index question → titres des ressources, depuis des couples (ressource, question). */
export function resourcesByQuestion(
  pairs: readonly { resourceId: string; questionId: string }[],
  titles: ReadonlyMap<string, string>,
): Map<string, { id: string; title: string }[]> {
  const out = new Map<string, { id: string; title: string }[]>();
  for (const p of pairs) {
    const title = titles.get(p.resourceId);
    if (!title) continue;
    const list = out.get(p.questionId) ?? [];
    if (!list.some((r) => r.id === p.resourceId)) list.push({ id: p.resourceId, title });
    out.set(p.questionId, list);
  }
  for (const list of out.values()) list.sort((a, b) => a.title.localeCompare(b.title, "fr"));
  return out;
}
