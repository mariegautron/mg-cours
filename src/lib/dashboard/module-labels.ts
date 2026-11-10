import { schoolYearOf } from "@/lib/modules/list-state";

/**
 * Nom affiché d'un module sur le tableau de bord : son nom, suivi de l'année scolaire
 * (« Scrum (2025-2026) ») SEULEMENT quand un autre module porte le même nom (copie d'une année
 * sur l'autre). Fonction pure.
 */
export function moduleLabels(
  modules: readonly { id: string; name: string; year: number | null }[],
): Map<string, string> {
  const count = new Map<string, number>();
  for (const m of modules) {
    const k = m.name.trim().toLocaleLowerCase("fr");
    count.set(k, (count.get(k) ?? 0) + 1);
  }
  return new Map(
    modules.map((m) => [
      m.id,
      (count.get(m.name.trim().toLocaleLowerCase("fr")) ?? 0) > 1 && typeof m.year === "number"
        ? `${m.name} (${schoolYearOf(m.year)})`
        : m.name,
    ]),
  );
}

type WithModule = { module?: { id: string; name: string } | null };
type WithModuleName = { moduleId?: string; moduleName?: string };

/**
 * Remplace sur place le nom du module des éléments d'une liste (`module: { id, name }` ou
 * `moduleId` + `moduleName`) par son nom affiché. Renvoie la liste.
 */
export function relabelModules<T extends object>(
  items: T[],
  labels: ReadonlyMap<string, string>,
): T[] {
  for (const item of items) {
    const a = item as WithModule;
    if (a.module && typeof a.module === "object" && labels.has(a.module.id))
      a.module = { ...a.module, name: labels.get(a.module.id)! };
    const b = item as WithModuleName;
    if (
      typeof b.moduleId === "string" &&
      typeof b.moduleName === "string" &&
      labels.has(b.moduleId)
    )
      b.moduleName = labels.get(b.moduleId)!;
  }
  return items;
}
