/**
 * Liste des modules refaite sur la maquette (ModulesListe) : état de chaque module, filtres et
 * libellés. Fonctions pures.
 */

export type ModuleListState = "to_prepare" | "running" | "taught" | "finished" | "archived";

export interface ListStateInput {
  archived_at: string | null;
  /** Absent si la migration n'est pas appliquée. */
  finished_at?: string | null;
  courses: { done: number; total: number };
}

/**
 * - rangé : `archived_at` ; terminé : `finished_at` ;
 * - cours faits : toutes les séances sont faites (reste à terminer) ;
 * - en cours : au moins une séance faite ; à préparer : aucune séance faite.
 */
export function moduleListState(m: ListStateInput): ModuleListState {
  if (m.archived_at) return "archived";
  if (m.finished_at) return "finished";
  if (m.courses.total > 0 && m.courses.done >= m.courses.total) return "taught";
  if (m.courses.done > 0) return "running";
  return "to_prepare";
}

export type ListFilter = "running" | "to_prepare" | "finished" | "archived";

export const FILTERS: readonly { key: ListFilter; label: string }[] = [
  { key: "running", label: "En cours" },
  { key: "to_prepare", label: "À préparer" },
  { key: "finished", label: "Terminés" },
  { key: "archived", label: "Rangés" },
];

export function parseListFilter(value: unknown): ListFilter {
  return FILTERS.some((f) => f.key === value) ? (value as ListFilter) : "running";
}

/** Un module « cours faits » reste dans « En cours » tant qu'on ne l'a pas terminé. */
export function inFilter(state: ModuleListState, filter: ListFilter): boolean {
  if (filter === "running") return state === "running" || state === "taught";
  return state === filter;
}

export function filterCounts(states: readonly ModuleListState[]): Record<ListFilter, number> {
  return {
    running: states.filter((s) => inFilter(s, "running")).length,
    to_prepare: states.filter((s) => s === "to_prepare").length,
    finished: states.filter((s) => s === "finished").length,
    archived: states.filter((s) => s === "archived").length,
  };
}

/** Année scolaire d'un module : « 2026-2027 » (année de début). */
export function schoolYearOf(year: number): string {
  return `${year}-${year + 1}`;
}

/** Comme `schoolYearOf`, mais dit « Année non renseignée » quand l'année manque. */
export function schoolYearLabel(year: number | null | undefined): string {
  return typeof year === "number" && Number.isFinite(year)
    ? schoolYearOf(year)
    : "Année non renseignée";
}

export interface PillInfo {
  label: string;
  tone: "wip" | "warn" | "ok" | "plain";
}

/** Pastille d'état à droite de la ligne. */
export function statePill(
  state: ModuleListState,
  courses: { done: number; total: number },
): PillInfo {
  switch (state) {
    case "to_prepare":
      return { label: "À préparer", tone: "warn" };
    case "running":
      return { label: `Séance ${courses.done} sur ${courses.total}`, tone: "wip" };
    case "taught":
      return { label: "Cours faits", tone: "ok" };
    case "finished":
      return { label: "Terminé", tone: "plain" };
    case "archived":
      return { label: "Rangé", tone: "plain" };
  }
}

/** « 14 h · à partir du 09/11 » : seulement pour un module pas encore commencé. */
export function metaLine(m: {
  /** Année de début : quand elle est donnée, la ligne commence par l'année scolaire. */
  year?: number | null;
  ycode: string | null;
  schoolName: string | null;
  level: string | null;
  totalHours: number;
  firstSessionDate: string | null;
  state: ModuleListState;
}): string {
  const parts = [
    "year" in m ? schoolYearLabel(m.year) : null,
    m.ycode,
    m.schoolName ?? "École non renseignée",
    m.level,
    `${m.totalHours} h`,
  ].filter(Boolean);
  if (m.state === "to_prepare" && m.firstSessionDate) {
    const [, mm, dd] = m.firstSessionDate.split("-");
    parts.push(`à partir du ${dd}/${mm}`);
  }
  return parts.join(" · ");
}
