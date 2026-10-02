/**
 * US-136 : clés stables des sections du déroulé projeté, partagées par la fabrique de diapositives,
 * la vue présentatrice (qui enregistre ce qu'elle projette) et la clôture (qui compare au prévu).
 */
export const OPENING_KEY = "opening";
export const CLOSING_KEY = "closing";

export const resourceKey = (id: string) => `resource:${id}`;
export const subjectKey = (title: string) => `subject:${title}`;

/** Sections de contenu prévues : les ressources étudiant·es puis les sujets, dans l'ordre du déroulé. */
export function plannedSections(
  resources: { id: string; title: string }[],
  subjects: { title: string }[],
): { key: string; title: string }[] {
  return [
    ...resources.map((r) => ({ key: resourceKey(r.id), title: r.title })),
    ...subjects.map((s) => ({ key: subjectKey(s.title), title: `Sujet — ${s.title}` })),
  ];
}
