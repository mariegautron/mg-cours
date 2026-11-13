import { GLOBAL_ENTRIES, placeOf, type GlobalEntry, type GlobalKey } from "@/lib/nav/places";

/**
 * US-118 : trois formes de menu selon la largeur. Fonctions pures ; les composants lisent ces
 * constantes (les classes Tailwind `md:` / `lg:` utilisent les mêmes seuils : 48rem et 64rem).
 */

/** Seuils en pixels (Tailwind : `md` = 768, `lg` = 1024). */
export const BREAKPOINTS = { tablet: 768, desktop: 1024 } as const;

export type MenuForm = "full" | "rail" | "bottom";

/** Menu latéral complet (ordinateur), rail d'icônes (tablette), barre du bas (téléphone). */
export function menuFormForWidth(width: number): MenuForm {
  if (width < BREAKPOINTS.tablet) return "bottom";
  if (width < BREAKPOINTS.desktop) return "rail";
  return "full";
}

/** Entrées du menu de gauche : celles de la table de navigation unique (plus d'« Évaluations »). */
export type MenuKey = GlobalKey;
export type MenuEntry = GlobalEntry;
export const MENU_ENTRIES: readonly MenuEntry[] = GLOBAL_ENTRIES;

/** Entrées de la barre du bas : quatre directes + « Plus » ; le reste est dans le tiroir. */
export const BOTTOM_COUNT = 4;

/**
 * Entrées affichées dans la forme demandée : le menu complet et le rail montrent les cinq ;
 * la barre du bas en montre quatre, `drawer` reçoit les autres (rien n'est inaccessible).
 */
export function entriesForForm(form: MenuForm): { main: MenuEntry[]; drawer: MenuEntry[] } {
  if (form !== "bottom") return { main: [...MENU_ENTRIES], drawer: [] };
  return { main: MENU_ENTRIES.slice(0, BOTTOM_COUNT), drawer: MENU_ENTRIES.slice(BOTTOM_COUNT) };
}

/** Entrée courante, lue dans la table (une grille allume Bibliothèque, /assessments Aujourd'hui). */
export function activeEntry(pathname: string): MenuKey | null {
  return placeOf(pathname)?.menu ?? null;
}
