/**
 * Barre de navigation d'un module (E19 / US-115 suite, US-116) : six liens vers des écrans
 * existants. L'entrée courante se déduit du chemin.
 */
export type ModuleNavKey =
  "journey" | "sessions" | "assessments" | "students" | "documents" | "invoice";

export interface ModuleNavItem {
  key: ModuleNavKey;
  label: string;
  href: string;
}

export function moduleNavItems(moduleId: string): ModuleNavItem[] {
  const base = `/modules/${moduleId}`;
  return [
    { key: "journey", label: "Où j’en suis", href: `${base}#progression` },
    { key: "sessions", label: "Séances", href: `${base}#courses` },
    { key: "assessments", label: "Évaluations", href: `${base}/assessments` },
    { key: "students", label: "Étudiant·es", href: `${base}#groups-evaluations` },
    { key: "documents", label: "Documents", href: `${base}#admin-docs` },
    { key: "invoice", label: "Facture", href: `${base}/billing` },
  ];
}

// Premier segment sous /modules/{id}/ → entrée du menu et libellé du fil d'Ariane.
const SECTION: Record<string, { key: ModuleNavKey | null; label: string }> = {
  expectations: { key: "journey", label: "Attendus de l’école" },
  matching: { key: "journey", label: "Rapprochement des ressources" },
  outline: { key: "journey", label: "Progression" },
  schedule: { key: "sessions", label: "Planning" },
  "import-courses": { key: "sessions", label: "Import des séances" },
  courses: { key: "sessions", label: "Séances" },
  assessments: { key: "assessments", label: "Évaluations" },
  project: { key: "assessments", label: "Projet fil rouge" },
  groups: { key: "students", label: "Groupes" },
  rattrapages: { key: "assessments", label: "Rattrapages" },
  appreciations: { key: "students", label: "Appréciations" },
  billing: { key: "invoice", label: "Facture" },
  edit: { key: null, label: "Modifier" },
};

function section(pathname: string, moduleId: string) {
  const prefix = `/modules/${moduleId}/`;
  if (!pathname.startsWith(prefix)) return null;
  return SECTION[pathname.slice(prefix.length).split("/")[0]] ?? null;
}

/** Entrée courante (`null` sur la fiche elle-même, dont les onglets gardent leur propre état). */
export function activeModuleNav(pathname: string, moduleId: string): ModuleNavKey | null {
  return section(pathname, moduleId)?.key ?? null;
}

/** Dernier élément du fil d'Ariane ; `null` sur la fiche module (qui a déjà son en-tête). */
export function moduleSectionLabel(pathname: string, moduleId: string): string | null {
  return section(pathname, moduleId)?.label ?? null;
}
