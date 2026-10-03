/**
 * US-151 : la bibliothèque en quatre familles (Cours, Ateliers, Évaluations, QCM). Les corrigés,
 * les modèles et les projets suivent les évaluations ; la banque de questions suit les QCM ;
 * références et notes ne sont d'aucune famille (visibles dans « Toutes »).
 */
import type { ResourceKind } from "./kind";

export const FAMILIES = ["courses", "workshops", "assessments", "quizzes"] as const;
export type ResourceFamily = (typeof FAMILIES)[number];

export const FAMILY_LABELS: Record<ResourceFamily, string> = {
  courses: "Cours",
  workshops: "Ateliers",
  assessments: "Évaluations",
  quizzes: "QCM",
};

const BY_KIND: Record<ResourceKind, ResourceFamily | null> = {
  course: "courses",
  workshop: "workshops",
  project: "assessments",
  template: "assessments",
  answer_key: "assessments",
  question_bank: "quizzes",
  reference: null,
  teacher_notes: null,
};

/** Famille d'une ressource ; `null` pour une ressource pas encore classée ou hors famille. */
export function familyOf(kind: ResourceKind | null | undefined): ResourceFamily | null {
  return kind ? BY_KIND[kind] : null;
}

export function isResourceFamily(value: unknown): value is ResourceFamily {
  return typeof value === "string" && (FAMILIES as readonly string[]).includes(value);
}

/** Nombre de ressources par famille. */
export function familyCounts(
  items: readonly { kind: ResourceKind | null }[],
): Record<ResourceFamily, number> {
  const counts: Record<ResourceFamily, number> = {
    courses: 0,
    workshops: 0,
    assessments: 0,
    quizzes: 0,
  };
  for (const it of items) {
    const f = familyOf(it.kind);
    if (f) counts[f] += 1;
  }
  return counts;
}

export function inFamily<T extends { kind: ResourceKind | null }>(
  items: readonly T[],
  family: ResourceFamily | undefined,
): T[] {
  return family ? items.filter((i) => familyOf(i.kind) === family) : [...items];
}

/** Pages rattachées à une famille (grilles, phrases, questions) : leurs anciennes URL restent valables. */
export const FAMILY_LINKS: Record<ResourceFamily, { label: string; href: string }[]> = {
  courses: [],
  workshops: [],
  assessments: [
    { label: "Grilles", href: "/assessments/grids" },
    { label: "Phrases", href: "/assessments/comments" },
  ],
  quizzes: [{ label: "Questions", href: "/questions" }],
};
