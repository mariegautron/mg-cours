import { isResourceFamily, type ResourceFamily } from "./family";
import {
  isResourceAudience,
  isResourceKind,
  isResourceStatus,
  type ResourceAudience,
  type ResourceKind,
  type ResourceStatus,
} from "./kind";

export type ResourceGrouping = "kind" | "category" | "none";

export interface ResourceListFilters {
  q?: string;
  /** Matière. */
  category?: string;
  tag?: string;
  /** `"none"` = ressources pas encore classées. */
  kind?: ResourceKind | "none";
  audience?: ResourceAudience;
  /** Prête ou « À construire ». */
  status?: ResourceStatus;
  archived?: boolean;
  /** Famille de la bibliothèque (US-151) ; appliquée après la requête. */
  family?: ResourceFamily;
}

type SearchParams = Record<string, string | string[] | undefined>;

const str = (v: SearchParams[string]) => (typeof v === "string" ? v.trim() : "");

/** Lit les filtres de `/resources` depuis l'URL ; toute valeur inconnue est ignorée. */
export function readResourceFilters(sp: SearchParams): {
  filters: ResourceListFilters;
  group: ResourceGrouping;
} {
  const kind = str(sp.kind);
  const audience = str(sp.audience);
  const status = str(sp.status);
  const group = str(sp.group);
  return {
    filters: {
      q: str(sp.q) || undefined,
      category: str(sp.category) || undefined,
      tag: str(sp.tag) || undefined,
      kind: kind === "none" || isResourceKind(kind) ? kind : undefined,
      audience: isResourceAudience(audience) ? audience : undefined,
      status: isResourceStatus(status) ? status : undefined,
      archived: sp.archived === "1",
      family: isResourceFamily(str(sp.family)) ? (str(sp.family) as ResourceFamily) : undefined,
    },
    group: group === "category" || group === "kind" ? group : "none",
  };
}
