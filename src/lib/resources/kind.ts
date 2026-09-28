import type { Enums } from "@/types/db";

export type ResourceKind = Enums<"resource_kind">;
export type ResourceAudience = Enums<"resource_audience">;
export type ResourceStatus = Enums<"resource_status">;

/** Ordre d'affichage des groupes (séance, module, liste). */
export const RESOURCE_KINDS: readonly ResourceKind[] = [
  "course",
  "workshop",
  "project",
  "template",
  "reference",
  "answer_key",
  "question_bank",
  "teacher_notes",
];

export const KIND_LABELS: Record<ResourceKind, string> = {
  course: "Cours",
  workshop: "Atelier / exercice",
  project: "Projet",
  template: "Modèle",
  answer_key: "Corrigé",
  question_bank: "Banque de questions",
  reference: "Référence externe",
  teacher_notes: "Notes enseignante",
};

/** Titre d'un groupe de ressources du même type. */
export const KIND_GROUP_LABELS: Record<ResourceKind, string> = {
  course: "Cours",
  workshop: "Ateliers",
  project: "Projet",
  template: "Modèles",
  answer_key: "Corrigés",
  question_bank: "Banque de questions",
  reference: "Références",
  teacher_notes: "Notes",
};

export const UNCLASSIFIED_LABEL = "Non classées";

export const AUDIENCE_LABELS: Record<ResourceAudience, string> = {
  students: "Étudiant·es",
  teacher: "Enseignante uniquement",
};

/** Ordre d'affichage des statuts. */
export const RESOURCE_STATUSES: readonly ResourceStatus[] = ["ready", "progress"];

export const STATUS_LABELS: Record<ResourceStatus, string> = {
  progress: "À construire",
  ready: "Prête",
};

/** Les ressources « À construire » ne sont jamais projetées. */
export const STUDENT_FACING_STATUSES: readonly ResourceStatus[] = ["ready"];

export function isResourceStatus(value: unknown): value is ResourceStatus {
  return typeof value === "string" && (RESOURCE_STATUSES as readonly string[]).includes(value);
}

/** Types dont le contenu est, par nature, réservé à l'enseignante (pré-sélection du formulaire). */
export const TEACHER_KINDS: readonly ResourceKind[] = [
  "answer_key",
  "question_bank",
  "teacher_notes",
];

export function isResourceKind(value: unknown): value is ResourceKind {
  return typeof value === "string" && (RESOURCE_KINDS as readonly string[]).includes(value);
}

export function isResourceAudience(value: unknown): value is ResourceAudience {
  return value === "students" || value === "teacher";
}

/**
 * Garde-fou : ne garde que ce qui peut partir chez les étudiant·es (présentation, export PDF,
 * futurs liens). Toute sortie vers les étudiant·es DOIT passer par ici.
 */
export function studentFacing<T extends { audience: ResourceAudience; status: ResourceStatus }>(
  resources: T[],
): T[] {
  return resources.filter(
    (r) => r.audience === "students" && STUDENT_FACING_STATUSES.includes(r.status),
  );
}

export interface ResourceGroup<T> {
  key: string;
  label: string;
  items: T[];
}

/** Regroupe par type dans l'ordre de `RESOURCE_KINDS`, « Non classées » en dernier. */
export function groupByKind<T extends { kind: ResourceKind | null }>(
  resources: T[],
): ResourceGroup<T>[] {
  const groups: ResourceGroup<T>[] = RESOURCE_KINDS.map((kind) => ({
    key: kind,
    label: KIND_GROUP_LABELS[kind],
    items: resources.filter((r) => r.kind === kind),
  }));
  groups.push({
    key: "none",
    label: UNCLASSIFIED_LABEL,
    items: resources.filter((r) => r.kind === null),
  });
  return groups.filter((g) => g.items.length > 0);
}

/** Regroupe par matière (ordre alphabétique français), « Sans matière » en dernier. */
export function groupByCategory<T extends { category: string | null }>(
  resources: T[],
): ResourceGroup<T>[] {
  const byCategory = new Map<string, T[]>();
  const none: T[] = [];
  for (const r of resources) {
    const category = r.category?.trim();
    if (!category) {
      none.push(r);
      continue;
    }
    byCategory.set(category, [...(byCategory.get(category) ?? []), r]);
  }
  const groups = Array.from(byCategory, ([category, items]) => ({
    key: category,
    label: category,
    items,
  })).sort((a, b) => a.label.localeCompare(b.label, "fr"));
  if (none.length) groups.push({ key: "none", label: "Sans matière", items: none });
  return groups;
}

/** Matières proposées d'office dans le formulaire (liste guidée, extensible par saisie libre). */
export const SUGGESTED_SUBJECTS: readonly string[] = [
  "Accessibilité",
  "Qualité web",
  "Numérique responsable",
  "Gestion de projet",
  "Agilité",
];

/** Suggestions de matière : matières proposées + matières déjà utilisées, sans doublon, triées. */
export function subjectSuggestions(used: readonly string[]): string[] {
  const seen = new Map<string, string>();
  for (const s of [...SUGGESTED_SUBJECTS, ...used]) {
    const key = s.trim().toLocaleLowerCase("fr");
    if (key && !seen.has(key)) seen.set(key, s.trim());
  }
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b, "fr"));
}
