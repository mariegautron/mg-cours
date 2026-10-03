/**
 * US-124 : construire les séances. Fonctions pures : réordonner le déroulé (souris, clavier,
 * boutons), appliquer l'ordre voulu à des ressources, statut d'une séance en mots.
 */

/** Déplace l'élément d'un rang à un autre ; liste inchangée si les rangs sont hors bornes. */
export function reorder<T>(items: readonly T[], from: number, to: number): T[] {
  if (from < 0 || from >= items.length || to < 0 || to >= items.length || from === to) {
    return [...items];
  }
  const copy = [...items];
  const [moved] = copy.splice(from, 1);
  copy.splice(to, 0, moved);
  return copy;
}

export const moveUp = <T>(items: readonly T[], index: number) => reorder(items, index, index - 1);
export const moveDown = <T>(items: readonly T[], index: number) => reorder(items, index, index + 1);

/**
 * Ressources dans l'ordre voulu : d'abord celles de `order` (dans cet ordre, doublons et absentes
 * ignorés), puis les autres dans leur ordre d'origine. Sans ordre, rien ne change.
 */
export function orderResources<T extends { id: string }>(
  resources: readonly T[],
  order: readonly string[] | null | undefined,
): T[] {
  if (!order || order.length === 0) return [...resources];
  const byId = new Map(resources.map((r) => [r.id, r]));
  const seen = new Set<string>();
  const first: T[] = [];
  for (const id of order) {
    const r = byId.get(id);
    if (r && !seen.has(id)) {
      first.push(r);
      seen.add(id);
    }
  }
  return [...first, ...resources.filter((r) => !seen.has(r.id))];
}

export type SessionStatus = "to_prepare" | "ready" | "done";

export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  to_prepare: "À préparer",
  ready: "Prête",
  done: "Faite",
};

/** Faite si la clôture le dit (faite ou partielle), sinon prête / à préparer selon la préparation. */
export function sessionStatus(course: {
  prep_status: string;
  completion: string | null;
}): SessionStatus {
  if (course.completion === "done" || course.completion === "partial") return "done";
  return course.prep_status === "ready" ? "ready" : "to_prepare";
}

export const DELIVERABLE_MAX = 2000;

/** Livrable de séance : texte nettoyé, erreur au-delà de la limite. */
export function cleanDeliverable(
  input: string,
): { ok: true; text: string } | { ok: false; error: string } {
  const text = input.replace(/\r\n/g, "\n").trim();
  return text.length > DELIVERABLE_MAX
    ? { ok: false, error: `${DELIVERABLE_MAX} caractères maximum.` }
    : { ok: true, text };
}
