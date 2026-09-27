export type ModuleFilter = "active" | "archived" | "all";

/** Lit le filtre de la liste des modules depuis l'URL (`?filter=`), `?archived=1` hérité → « Tous ». */
export function parseModuleFilter(sp: {
  filter?: string | string[];
  archived?: string | string[];
}): ModuleFilter {
  const filter = Array.isArray(sp.filter) ? sp.filter[0] : sp.filter;
  if (filter === "archived" || filter === "all") return filter;
  if (sp.archived === "1") return "all";
  return "active";
}

/**
 * Sépare modules actifs / archivés. L'ordre des actifs est conservé ; les archivés sont triés
 * du plus récemment archivé au plus ancien.
 */
export function splitModules<T extends { archived_at: string | null }>(
  modules: T[],
): { active: T[]; archived: T[] } {
  const active = modules.filter((m) => !m.archived_at);
  const archived = modules
    .filter((m) => m.archived_at)
    .sort((a, b) => (b.archived_at ?? "").localeCompare(a.archived_at ?? ""));
  return { active, archived };
}
