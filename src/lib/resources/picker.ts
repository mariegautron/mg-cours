import type { ResourceKind } from "./kind";
import { normalizeSearch, searchResource } from "./search";

export { normalizeSearch };

/**
 * US-62 : recherche et filtres du sélecteur de ressources d'une séance. Fonctions pures.
 */

export interface PickerResource {
  id: string;
  title: string;
  kind: ResourceKind | null;
  category: string | null;
  /** US-56 : la recherche porte aussi sur ces champs. */
  description?: string | null;
  tags?: string[] | null;
  content?: string | null;
}

export interface PickerFilters {
  /** Texte cherché dans le titre, les tags, la description et le contenu (casse et accents ignorés). */
  q: string;
  /** `""` = tous les types, `"none"` = pas encore classées. */
  kind: ResourceKind | "none" | "";
  /** `""` = toutes les matières. */
  category: string;
  /** Ne garder que les ressources retenues du module. */
  retainedOnly: boolean;
}

export const NO_PICKER_FILTERS: PickerFilters = {
  q: "",
  kind: "",
  category: "",
  retainedOnly: false,
};

export function filterPickerResources<T extends PickerResource>(
  resources: T[],
  filters: PickerFilters,
  retainedIds: ReadonlySet<string>,
): T[] {
  return resources.filter((r) => {
    if (!searchResource(r, filters.q).matched) return false;
    if (filters.kind === "none" ? r.kind !== null : filters.kind && r.kind !== filters.kind) {
      return false;
    }
    if (filters.category && (r.category ?? "") !== filters.category) return false;
    if (filters.retainedOnly && !retainedIds.has(r.id)) return false;
    return true;
  });
}

/** Matières distinctes présentes, triées à la française. */
export function pickerCategories(resources: { category: string | null }[]): string[] {
  const set = new Set<string>();
  for (const r of resources) if (r.category?.trim()) set.add(r.category.trim());
  return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
}
