/**
 * Table de navigation unique (lot N1, 13 nov. 2026) : pour chaque route de l'appli, sa « place »
 * = entrée du menu de gauche, entrée du module éventuelle, onglet éventuel et libellé du fil
 * d'Ariane. Le menu, les onglets et le fil d'Ariane lisent tous cette table. Fonctions pures.
 *
 * Aucune adresse ne change : seule la façon de relier les pages change.
 */

export type GlobalKey = "dashboard" | "modules" | "students" | "library" | "billing" | "settings";

export type ModuleEntryKey =
  "week" | "sessions" | "assessments" | "class" | "space" | "program" | "closing";

export interface NavLink {
  key: string;
  label: string;
  href: string;
}

export interface GlobalEntry extends NavLink {
  key: GlobalKey;
}

export const GLOBAL_ENTRIES: readonly GlobalEntry[] = [
  { key: "dashboard", href: "/dashboard", label: "Aujourd’hui" },
  { key: "modules", href: "/modules", label: "Tous les modules" },
  { key: "students", href: "/students", label: "Étudiant·es" },
  { key: "library", href: "/resources", label: "Bibliothèque" },
  { key: "billing", href: "/billing", label: "Facturation" },
  { key: "settings", href: "/settings", label: "Réglages" },
];

/** Onglets des entrées globales qui en ont. */
export const GLOBAL_TABS: Partial<Record<GlobalKey, NavLink[]>> = {
  dashboard: [
    { key: "today", label: "Aujourd’hui", href: "/dashboard" },
    { key: "agenda", label: "Agenda des évaluations", href: "/assessments" },
  ],
  library: [
    { key: "resources", label: "Ressources", href: "/resources" },
    { key: "questions", label: "Questions", href: "/questions" },
    { key: "grids", label: "Grilles", href: "/assessments/grids" },
    { key: "phrases", label: "Phrases de commentaire", href: "/assessments/comments" },
  ],
};

export interface ModuleEntry extends NavLink {
  key: ModuleEntryKey;
  tabs: NavLink[];
}

/** Les 7 entrées d'un module et leurs onglets. */
export function moduleEntries(moduleId: string): ModuleEntry[] {
  const b = `/modules/${moduleId}`;
  return [
    { key: "week", label: "Cette semaine", href: b, tabs: [] },
    {
      key: "sessions",
      label: "Séances",
      href: `${b}/courses`,
      tabs: [
        { key: "list", label: "Liste", href: `${b}/courses` },
        { key: "planning", label: "Planning", href: `${b}/planning` },
        { key: "schedule", label: "Importer des dates", href: `${b}/schedule` },
      ],
    },
    {
      key: "assessments",
      label: "Évaluations",
      href: `${b}/assessments`,
      tabs: [
        { key: "all", label: "Toutes", href: `${b}/assessments` },
        { key: "project", label: "Projet fil rouge", href: `${b}/project` },
        { key: "makeups", label: "Rattrapages", href: `${b}/rattrapages` },
      ],
    },
    {
      key: "class",
      label: "Classe",
      href: `${b}/groups`,
      tabs: [
        { key: "groups", label: "Étudiant·es et groupes", href: `${b}/groups` },
        { key: "appreciations", label: "Appréciations", href: `${b}/appreciations` },
      ],
    },
    { key: "space", label: "Espace étudiant·es", href: `${b}/frise`, tabs: [] },
    {
      key: "program",
      label: "Programme",
      href: `${b}/expectations`,
      tabs: [
        { key: "expectations", label: "Attendus et couverture", href: `${b}/expectations` },
        { key: "outline", label: "Progression", href: `${b}/outline` },
      ],
    },
    {
      key: "closing",
      label: "Clôture",
      href: `${b}/feedback`,
      tabs: [
        { key: "feedback", label: "Avis", href: `${b}/feedback` },
        { key: "documents", label: "Documents", href: `${b}/documents` },
        { key: "billing", label: "Facture", href: `${b}/billing` },
        { key: "finish", label: "Terminer le module", href: `${b}/finish` },
      ],
    },
  ];
}

/**
 * Premier segment sous /modules/[id]/ → entrée, onglet, libellé du fil d'Ariane.
 * Les sous-pages (une évaluation, une séance…) héritent de la place de leur premier segment.
 */
const MODULE_SEGMENTS: Record<string, { entry: ModuleEntryKey; tab?: string; crumb: string }> = {
  courses: { entry: "sessions", tab: "list", crumb: "Séances" },
  planning: { entry: "sessions", tab: "planning", crumb: "Planning" },
  schedule: { entry: "sessions", tab: "schedule", crumb: "Importer des dates" },
  "import-courses": { entry: "sessions", tab: "list", crumb: "Séances" },
  build: { entry: "sessions", tab: "list", crumb: "Séances" },
  assessments: { entry: "assessments", tab: "all", crumb: "Évaluations" },
  project: { entry: "assessments", tab: "project", crumb: "Projet fil rouge" },
  rattrapages: { entry: "assessments", tab: "makeups", crumb: "Rattrapages" },
  jalons: { entry: "assessments", tab: "all", crumb: "Évaluations" },
  groups: { entry: "class", tab: "groups", crumb: "Étudiant·es et groupes" },
  appreciations: { entry: "class", tab: "appreciations", crumb: "Appréciations" },
  frise: { entry: "space", crumb: "Espace étudiant·es" },
  apercu: { entry: "space", crumb: "Aperçu de l’espace" },
  expectations: { entry: "program", tab: "expectations", crumb: "Attendus et couverture" },
  couverture: { entry: "program", tab: "expectations", crumb: "Attendus et couverture" },
  matching: { entry: "program", tab: "expectations", crumb: "Attendus et couverture" },
  outline: { entry: "program", tab: "outline", crumb: "Progression" },
  feedback: { entry: "closing", tab: "feedback", crumb: "Avis" },
  documents: { entry: "closing", tab: "documents", crumb: "Documents" },
  billing: { entry: "closing", tab: "billing", crumb: "Facture" },
  finish: { entry: "closing", tab: "finish", crumb: "Terminer le module" },
  edit: { entry: "week", crumb: "Modifier le module" },
};

/** Préfixes des pages globales → entrée du menu et onglet. Le plus long gagne. */
const GLOBAL_PREFIXES: { prefix: string; menu: GlobalKey; tab?: string; crumb: string }[] = [
  { prefix: "/dashboard", menu: "dashboard", tab: "today", crumb: "Aujourd’hui" },
  { prefix: "/assessments/grids", menu: "library", tab: "grids", crumb: "Grilles" },
  {
    prefix: "/assessments/comments",
    menu: "library",
    tab: "phrases",
    crumb: "Phrases de commentaire",
  },
  { prefix: "/assessments", menu: "dashboard", tab: "agenda", crumb: "Agenda des évaluations" },
  { prefix: "/resources", menu: "library", tab: "resources", crumb: "Ressources" },
  { prefix: "/questions", menu: "library", tab: "questions", crumb: "Questions" },
  { prefix: "/students", menu: "students", crumb: "Étudiant·es" },
  { prefix: "/billing", menu: "billing", crumb: "Facturation" },
  { prefix: "/settings", menu: "settings", crumb: "Réglages" },
  { prefix: "/modules", menu: "modules", crumb: "Tous les modules" },
];

export interface Place {
  menu: GlobalKey;
  /** Onglet actif de la page (clé de GLOBAL_TABS ou des onglets de l'entrée du module). */
  tab: string | null;
  /** Page d'un module : son id et son entrée. */
  moduleId: string | null;
  moduleEntry: ModuleEntryKey | null;
  /** Libellé de la section pour le fil d'Ariane. */
  crumb: string;
  /** Chemin de la section (lien du fil d'Ariane). */
  crumbHref: string;
}

const MODULE_RE = /^\/modules\/([^/]+)(?:\/([^/]+))?/;

/** Place d'une route ; `null` hors de l'appli (connexion, espace étudiant·e, projection…). */
export function placeOf(pathname: string): Place | null {
  const path = pathname.replace(/\/$/, "") || "/";
  const m = path.match(MODULE_RE);
  if (m && m[1] !== "new") {
    const moduleId = m[1];
    const segment = m[2];
    if (!segment) {
      return {
        menu: "modules",
        tab: null,
        moduleId,
        moduleEntry: "week",
        crumb: "Cette semaine",
        crumbHref: `/modules/${moduleId}`,
      };
    }
    const s = MODULE_SEGMENTS[segment];
    if (!s) return null;
    const entry = moduleEntries(moduleId).find((e) => e.key === s.entry)!;
    const tabHref = entry.tabs.find((t) => t.key === s.tab)?.href;
    return {
      menu: "modules",
      tab: s.tab ?? null,
      moduleId,
      moduleEntry: s.entry,
      crumb: s.crumb,
      crumbHref: tabHref ?? `/modules/${moduleId}/${segment}`,
    };
  }
  const g = [...GLOBAL_PREFIXES]
    .sort((a, b) => b.prefix.length - a.prefix.length)
    .find((p) => path === p.prefix || path.startsWith(`${p.prefix}/`));
  if (!g) return null;
  return {
    menu: g.menu,
    tab: g.tab ?? null,
    moduleId: null,
    moduleEntry: null,
    crumb: g.crumb,
    crumbHref: g.prefix,
  };
}

/** Onglets à afficher pour une place (vide si l'entrée n'en a pas). */
export function tabsOf(place: Place): NavLink[] {
  if (place.moduleId && place.moduleEntry) {
    return moduleEntries(place.moduleId).find((e) => e.key === place.moduleEntry)?.tabs ?? [];
  }
  return GLOBAL_TABS[place.menu] ?? [];
}

/**
 * Même section dans un autre module (cliquer un autre module garde la section) : l'adresse de
 * l'onglet courant, sinon « Cette semaine ».
 */
export function sameSectionIn(pathname: string, otherModuleId: string): string {
  const place = placeOf(pathname);
  if (!place?.moduleEntry) return `/modules/${otherModuleId}`;
  const entry = moduleEntries(otherModuleId).find((e) => e.key === place.moduleEntry)!;
  return entry.tabs.find((t) => t.key === place.tab)?.href ?? entry.href;
}
