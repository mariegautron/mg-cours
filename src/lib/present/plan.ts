/**
 * US-136 : clés stables des sections du déroulé projeté, partagées par la fabrique de diapositives,
 * la vue présentatrice (qui enregistre ce qu'elle projette) et la clôture (qui compare au prévu).
 */
export const OPENING_KEY = "opening";
export const CLOSING_KEY = "closing";

export const RESUME_KEY = "opening:resume";
export const OBJECTIVES_KEY = "opening:objectives";

export const resourceKey = (id: string) => `resource:${id}`;
export const qcmKey = (resourceId: string) => `qcm:${resourceId}`;
export const subjectKey = (title: string) => `subject:${title}`;
export const cadreKey = (title: string) => `cadre:${title}`;
export const gridKey = (title: string) => `grid:${title}`;

/**
 * « Pour moi » : éléments du déroulé que Marie ne projette pas (« Avant de commencer »). Ils
 * voyagent dans l'adresse des deux fenêtres (`?hide=a,b`), donc les diapositives restent les mêmes
 * des deux côtés ; un élément caché disparaît de la projection.
 */
export function parseHidden(param: string | string[] | undefined): Set<string> {
  const raw = Array.isArray(param) ? param.join(",") : (param ?? "");
  return new Set(
    raw
      .split(",")
      .map((k) => {
        try {
          return decodeURIComponent(k).trim();
        } catch {
          return "";
        }
      })
      .filter(Boolean)
      .slice(0, 100),
  );
}

export function serializeHidden(keys: Iterable<string>): string {
  return [...keys].map((k) => encodeURIComponent(k)).join(",");
}

/** Adresse d'une fenêtre du cours, avec les éléments « pour moi » à ne pas projeter. */
export function withHidden(path: string, keys: Iterable<string>): string {
  const hide = serializeHidden(keys);
  return hide ? `${path}?hide=${hide}` : path;
}

/** Sections de contenu prévues : les ressources étudiant·es puis les sujets, dans l'ordre du déroulé. */
export function plannedSections(
  resources: { id: string; title: string }[],
  subjects: {
    title: string;
    hasCadre?: boolean;
    hasGrid?: boolean;
    /** Sujet complet (`SubjectDeckInput`) : le cadre et la grille y sont ou non. */
    cadre?: unknown;
    grid?: unknown;
  }[],
  hidden: ReadonlySet<string> = new Set(),
): { key: string; title: string }[] {
  return [
    ...resources.map((r) => ({ key: resourceKey(r.id), title: r.title })),
    ...subjects.flatMap((s) => [
      { key: subjectKey(s.title), title: `Sujet — ${s.title}` },
      ...((s.hasCadre ?? !!s.cadre)
        ? [{ key: cadreKey(s.title), title: `Cadre — ${s.title}` }]
        : []),
      ...((s.hasGrid ?? !!s.grid) ? [{ key: gridKey(s.title), title: `Grille — ${s.title}` }] : []),
    ]),
  ].filter((p) => !hidden.has(p.key));
}

/**
 * Éléments gardés « pour moi » d'une séance, retrouvés dans le journal : une clé notée en privé et
 * jamais projetée n'est pas « à reporter ».
 */
export function keptForMeKeys(
  events: readonly { sectionKey: string | null; kind: "projected" | "private" }[],
): Set<string> {
  const projected = new Set(
    events.filter((e) => e.kind === "projected" && e.sectionKey).map((e) => e.sectionKey!),
  );
  return new Set(
    events
      .filter((e) => e.kind === "private" && e.sectionKey && !projected.has(e.sectionKey))
      .map((e) => e.sectionKey!),
  );
}
