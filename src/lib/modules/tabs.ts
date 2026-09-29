/**
 * Onglets de la fiche module : chaque ancre (`#courses`, `#billing`…) désigne l'onglet qui
 * contient la section, pour que les liens existants continuent de fonctionner.
 */
export const MODULE_TABS = ["progression", "courses", "groups-evaluations", "admin"] as const;

export type ModuleTab = (typeof MODULE_TABS)[number];

import type { TrameAlertLevel } from "@/lib/ynov/trame";

/** Onglet quand rien ne demande d'action : le geste fréquent est de travailler les séances. */
export const DEFAULT_MODULE_TAB: ModuleTab = "courses";

/**
 * Onglet à ouvrir sur une fiche module sans ancre : « Progression » tant que la progression
 * pédagogique demande une action (en retard, J-7, J-15), sinon « Séances ». L'ancre de l'URL
 * (`#billing`…) reste prioritaire.
 */
export function defaultModuleTab(level: TrameAlertLevel): ModuleTab {
  return level === "overdue" || level === "urgent" || level === "warning"
    ? "progression"
    : DEFAULT_MODULE_TAB;
}

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
export function tabFromHash(hash: string, fallback: ModuleTab = DEFAULT_MODULE_TAB): ModuleTab {
  const id = decodeURIComponent(hash.replace(/^#/, ""));
  return TAB_OF_ANCHOR[id] ?? fallback;
}

/** Vrai si l'ancre désigne une section (et non un onglet) : il faut alors y faire défiler. */
export function isSectionAnchor(hash: string): boolean {
  const id = decodeURIComponent(hash.replace(/^#/, ""));
  return id in TAB_OF_ANCHOR && !(MODULE_TABS as readonly string[]).includes(id);
}
