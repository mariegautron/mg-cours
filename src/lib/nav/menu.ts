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

export type MenuKey = "dashboard" | "modules" | "students" | "library" | "settings";

export interface MenuEntry {
  key: MenuKey;
  href: string;
  label: string;
}

export const MENU_ENTRIES: readonly MenuEntry[] = [
  { key: "dashboard", href: "/dashboard", label: "Aujourd’hui" },
  { key: "modules", href: "/modules", label: "Modules" },
  { key: "students", href: "/students", label: "Étudiant·es" },
  { key: "library", href: "/resources", label: "Bibliothèque" },
  { key: "settings", href: "/settings", label: "Réglages" },
];

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

/** Entrée courante par préfixe d'URL (« /modules/abc » → Modules). */
export function activeEntry(pathname: string): MenuKey | null {
  return (
    MENU_ENTRIES.find((e) => pathname === e.href || pathname.startsWith(`${e.href}/`))?.key ?? null
  );
}
