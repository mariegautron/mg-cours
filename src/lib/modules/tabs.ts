/**
 * Onglets de la fiche module : chaque ancre (`#courses`, `#billing`…) désigne l'onglet qui
 * contient la section, pour que les liens existants continuent de fonctionner.
 */
export const MODULE_TABS = ["progression", "courses", "groups-evaluations", "admin"] as const;

export type ModuleTab = (typeof MODULE_TABS)[number];

export const DEFAULT_MODULE_TAB: ModuleTab = "progression";

const TAB_OF_ANCHOR: Record<string, ModuleTab> = {
  progression: "progression",
  trame: "progression",
  courses: "courses",
  "groups-evaluations": "groups-evaluations",
  groups: "groups-evaluations",
  assessments: "groups-evaluations",
  admin: "admin",
  documents: "admin",
  billing: "admin",
  "admin-docs": "admin",
  danger: "admin",
};

/** Onglet à ouvrir pour un `location.hash` ; l'onglet par défaut si l'ancre est inconnue. */
export function tabFromHash(hash: string): ModuleTab {
  const id = decodeURIComponent(hash.replace(/^#/, ""));
  return TAB_OF_ANCHOR[id] ?? DEFAULT_MODULE_TAB;
}

/** Vrai si l'ancre désigne une section (et non un onglet) : il faut alors y faire défiler. */
export function isSectionAnchor(hash: string): boolean {
  const id = decodeURIComponent(hash.replace(/^#/, ""));
  return id in TAB_OF_ANCHOR && !(MODULE_TABS as readonly string[]).includes(id);
}
