/**
 * US-128 : imprévus du client (mails planifiés entre les séances d'un projet). Fonctions pures.
 */

export interface Surprise {
  id: string;
  title: string;
  body: string;
  courseId: string | null;
  sentAt: string | null;
}

export const MAX_TITLE = 200;
export const MAX_BODY = 5000;

export function cleanSurprise(input: {
  title: string;
  body: string;
}): { ok: true; title: string; body: string } | { ok: false; error: string } {
  const title = input.title.replace(/\s+/g, " ").trim();
  const body = input.body.replace(/\r\n/g, "\n").trim();
  if (!title) return { ok: false, error: "Donne un titre à l’imprévu." };
  if (title.length > MAX_TITLE)
    return { ok: false, error: `Titre : ${MAX_TITLE} caractères au plus.` };
  if (body.length > MAX_BODY)
    return { ok: false, error: `Message : ${MAX_BODY} caractères au plus.` };
  return { ok: true, title, body };
}

/** Imprévus à rappeler un jour de cours : pas encore envoyés, rattachés à une séance d'aujourd'hui. */
export function dueToday<T extends Surprise>(
  surprises: readonly T[],
  todayCourseIds: ReadonlySet<string>,
): T[] {
  return surprises.filter(
    (s) => !s.sentAt && s.courseId !== null && todayCourseIds.has(s.courseId),
  );
}

/** Tri : par rang de la séance de diffusion (sans séance à la fin), envoyés après les autres. */
export function sortSurprises<T extends Pick<Surprise, "courseId" | "sentAt" | "title">>(
  surprises: readonly T[],
  courseOrder: ReadonlyMap<string, number>,
): T[] {
  const rank = (s: T) => (s.courseId ? (courseOrder.get(s.courseId) ?? 9998) : 9999);
  return [...surprises].sort(
    (a, b) =>
      Number(!!a.sentAt) - Number(!!b.sentAt) ||
      rank(a) - rank(b) ||
      a.title.localeCompare(b.title, "fr"),
  );
}

/** Texte copié : le message tel quel ; à défaut, le titre. */
export function copyText(s: Pick<Surprise, "title" | "body">): string {
  return s.body.trim() || s.title;
}

/** « Séance 3 », « Pas de séance choisie ». */
export function deliveryLabel(
  courseId: string | null,
  courseOrder: ReadonlyMap<string, number>,
): string {
  if (!courseId) return "Pas de séance choisie";
  const n = courseOrder.get(courseId);
  return n ? `Séance ${n}` : "Séance supprimée";
}
