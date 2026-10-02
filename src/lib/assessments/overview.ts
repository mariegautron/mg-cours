/**
 * US-138 : vue d'ensemble des copies d'une évaluation. Fonctions pures : statut de correction de
 * chaque copie (à corriger / en cours / corrigée), avancement global, prochaine copie à reprendre.
 */
export type CopyState = "todo" | "in_progress" | "done";

export const COPY_STATE_LABELS: Record<CopyState, string> = {
  todo: "À corriger",
  in_progress: "En cours",
  done: "Corrigé",
};

export interface OverviewGrade {
  value: number | null;
  scores: unknown;
  criterion_comments?: unknown;
  feedback?: string | null;
  strengths?: string | null;
  progress?: string | null;
}

export interface OverviewItem {
  id: string;
  title: string;
  /** Groupe d'appartenance (note individuelle) ou thème (note de groupe), pour l'affichage. */
  context?: string | null;
  members?: string[];
  grade?: OverviewGrade | null;
}

export interface OverviewRow extends OverviewItem {
  state: CopyState;
  /** Critères notés sur le total (« 2 sur 4 »), `null` sans grille. */
  scored: number | null;
  total: number | null;
  /** Note affichée (`null` tant que la copie n'est pas corrigée). */
  value: number | null;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const hasText = (v: unknown) => typeof v === "string" && v.trim() !== "";

/** Critères pour lesquels une saisie existe (un nombre). Les critères validés d'office comptent comme notés. */
export function scoredCount(
  scores: unknown,
  criteriaIds: readonly string[],
  autoValidatedIds: readonly string[] = [],
): number {
  const s = isRecord(scores) ? scores : {};
  return criteriaIds.filter(
    (id) => autoValidatedIds.includes(id) || (typeof s[id] === "number" && Number.isFinite(s[id])),
  ).length;
}

/** Une note enregistrée = corrigée ; sinon « en cours » dès qu'une saisie existe (critère, commentaire, texte). */
export function copyState(
  grade: OverviewGrade | null | undefined,
  criteriaIds: readonly string[],
): CopyState {
  if (!grade) return "todo";
  if (grade.value !== null && grade.value !== undefined) return "done";
  const comments = isRecord(grade.criterion_comments)
    ? Object.values(grade.criterion_comments).some(hasText)
    : false;
  const started =
    scoredCount(grade.scores, criteriaIds) > 0 ||
    comments ||
    hasText(grade.feedback) ||
    hasText(grade.strengths) ||
    hasText(grade.progress);
  return started ? "in_progress" : "todo";
}

export interface Overview {
  rows: OverviewRow[];
  done: number;
  inProgress: number;
  todo: number;
  total: number;
  /** « 2 corrigés sur 6 » (au singulier « 1 corrigé sur 6 »). */
  label: string;
  /** Moyenne des notes des copies corrigées (`null` s'il n'y en a pas). */
  average: number | null;
  /** Copie à ouvrir avec « Continuer » : une copie en cours d'abord, sinon la première à corriger. */
  next: OverviewRow | null;
}

export function correctionOverview(
  items: readonly OverviewItem[],
  criteriaIds: readonly string[] = [],
  autoValidatedIds: readonly string[] = [],
): Overview {
  const rows = items.map((item): OverviewRow => {
    const state = copyState(item.grade, criteriaIds);
    const hasGrid = criteriaIds.length > 0;
    return {
      ...item,
      state,
      scored: hasGrid ? scoredCount(item.grade?.scores, criteriaIds, autoValidatedIds) : null,
      total: hasGrid ? criteriaIds.length : null,
      value: state === "done" ? (item.grade?.value ?? null) : null,
    };
  });
  const done = rows.filter((r) => r.state === "done");
  const values = done.map((r) => r.value).filter((v): v is number => v !== null);
  const total = rows.length;
  return {
    rows,
    done: done.length,
    inProgress: rows.filter((r) => r.state === "in_progress").length,
    todo: rows.filter((r) => r.state === "todo").length,
    total,
    label: `${done.length} corrigé${done.length > 1 ? "s" : ""} sur ${total}`,
    average:
      values.length > 0
        ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100
        : null,
    next:
      rows.find((r) => r.state === "in_progress") ?? rows.find((r) => r.state === "todo") ?? null,
  };
}

export type OverviewFilter = "all" | "todo" | "done";

/** Filtre de la liste : « À corriger » regroupe à corriger et en cours. */
export function filterRows(rows: readonly OverviewRow[], filter: OverviewFilter): OverviewRow[] {
  if (filter === "all") return [...rows];
  if (filter === "done") return rows.filter((r) => r.state === "done");
  return rows.filter((r) => r.state !== "done");
}

/** « 2 critères sur 4 notés. » ; « » sans grille. */
export function progressNote(row: Pick<OverviewRow, "scored" | "total">): string {
  if (row.scored === null || row.total === null) return "";
  return `${row.scored} critère${row.scored > 1 ? "s" : ""} sur ${row.total} noté${row.scored > 1 ? "s" : ""}.`;
}
