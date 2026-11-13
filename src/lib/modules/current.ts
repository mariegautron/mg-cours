import { inFilter, moduleListState } from "@/lib/modules/list-state";

type ListInput = Parameters<typeof moduleListState>[0];

/**
 * Module « en cours » : une seule règle pour le menu (« Mes modules en cours ») et Aujourd'hui
 * (« N modules en cours »). En cours au sens de la liste des modules (cours commencés), ou une
 * séance dans les 30 prochains jours (un module à préparer qui démarre bientôt, comme Yboost).
 */
export function isCurrentModule(
  m: Omit<ListInput, "courses">,
  courses: { done: number; total: number },
  daysToNextSession: number | null,
): boolean {
  if (inFilter(moduleListState({ ...m, courses } as ListInput), "running")) return true;
  return daysToNextSession !== null && daysToNextSession >= 0 && daysToNextSession <= 30;
}
