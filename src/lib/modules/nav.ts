/**
 * Menu d'un module : les 7 entrées de la table de navigation unique (`lib/nav/places.ts`).
 * Gardé pour les composants existants ; toute la logique est dans la table.
 */
import { moduleEntries, placeOf, type ModuleEntryKey } from "@/lib/nav/places";

export type ModuleNavKey = ModuleEntryKey;

export interface ModuleNavItem {
  key: ModuleNavKey;
  label: string;
  href: string;
}

export function moduleNavItems(moduleId: string): ModuleNavItem[] {
  return moduleEntries(moduleId).map(({ key, label, href }) => ({ key, label, href }));
}

/** Entrée courante du module (`null` hors de ce module). */
export function activeModuleNav(pathname: string, moduleId: string): ModuleNavKey | null {
  const place = placeOf(pathname);
  return place?.moduleId === moduleId ? place.moduleEntry : null;
}

/** Libellé de la section pour le fil d'Ariane (`null` hors de ce module). */
export function moduleSectionLabel(pathname: string, moduleId: string): string | null {
  const place = placeOf(pathname);
  return place?.moduleId === moduleId ? place.crumb : null;
}
