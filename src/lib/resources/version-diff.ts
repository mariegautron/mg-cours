/** Ce qui change d'une version d'une ressource à la suivante (historique). Fonctions pures. */

export interface VersionFields {
  title: string;
  description: string | null;
  content: string | null;
  tags: string[];
  category: string | null;
  url: string | null;
}

/** Lignes ajoutées et retirées (comptées sur les lignes non vides, sans tenir compte de l'ordre). */
export function lineDelta(
  before: string | null,
  after: string | null,
): { added: number; removed: number } {
  const lines = (text: string | null) =>
    (text ?? "")
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  const count = new Map<string, number>();
  for (const l of lines(before)) count.set(l, (count.get(l) ?? 0) + 1);
  let added = 0;
  for (const l of lines(after)) {
    const n = count.get(l) ?? 0;
    if (n > 0) count.set(l, n - 1);
    else added++;
  }
  const removed = [...count.values()].reduce((a, b) => a + b, 0);
  return { added, removed };
}

/** Résumé lisible : « Titre · Contenu : +3 lignes, −1 · Tags ». */
export function describeChange(before: VersionFields, after: VersionFields): string[] {
  const out: string[] = [];
  if (before.title.trim() !== after.title.trim()) out.push("Titre");
  const { added, removed } = lineDelta(before.content, after.content);
  if (added || removed) {
    const parts = [
      added ? `+${added} ligne${added > 1 ? "s" : ""}` : null,
      removed ? `−${removed}` : null,
    ].filter(Boolean);
    out.push(`Contenu : ${parts.join(", ")}`);
  } else if ((before.content ?? "") !== (after.content ?? "")) {
    out.push("Contenu : mise en forme");
  }
  if ((before.description ?? "") !== (after.description ?? "")) out.push("Description");
  if (before.tags.join("|") !== after.tags.join("|")) out.push("Tags");
  if ((before.category ?? "") !== (after.category ?? "")) out.push("Matière");
  if ((before.url ?? "") !== (after.url ?? "")) out.push("Lien");
  return out;
}
