/**
 * « Les évaluations du module » : la frise qui croise les séances et les évaluations (quel cours
 * alimente quel rendu) et l'état de préparation de chaque évaluation. Fonctions pures.
 */
import { isPlaceholderTitle } from "@/lib/modules/outline-checks";

export interface TimelineCourse {
  id: string;
  title: string;
  /** Date ISO de la séance, ou `null`. */
  date: string | null;
  /** « à construire » : le contenu de la séance n'est pas prêt. */
  toBuild: boolean;
}

export interface TimelineAssessment {
  id: string;
  title: string;
  courseId: string | null;
  /** `milestone`, `oral`, `individual` ou `null` (évaluation hors projet). */
  role: "milestone" | "oral" | "individual" | null;
  isGroupGrade: boolean;
  makeup: boolean;
}

export type CellKind = "launch" | "work" | "due" | "oral" | "solo";

export interface TimelineCell {
  /** Colonne de départ (0 = première séance) et largeur en colonnes. */
  col: number;
  span: number;
  kind: CellKind;
  label: string;
}

export interface TimelineRow {
  assessmentId: string;
  title: string;
  /** « Projet fil rouge · groupe ×1 · rendu séance 3 ». */
  subtitle: string;
  /** Numéro (1-based) de la séance du rendu, `null` si l'évaluation n'est pas rattachée à une séance. */
  dueSession: number | null;
  cells: TimelineCell[];
}

const ORDER: Record<string, number> = { milestone: 0, oral: 1, individual: 2 };

/** Les évaluations se rangent par rôle (jalons, oral, individuelle) puis par séance du rendu. */
function sortAssessments<T extends TimelineAssessment>(list: T[], dueIndex: (a: T) => number): T[] {
  return [...list].sort(
    (a, b) =>
      (a.role ? ORDER[a.role] : 3) - (b.role ? ORDER[b.role] : 3) || dueIndex(a) - dueIndex(b),
  );
}

export function buildTimeline(
  courses: readonly TimelineCourse[],
  assessments: readonly TimelineAssessment[],
): TimelineRow[] {
  const index = new Map(courses.map((c, i) => [c.id, i]));
  const due = (a: TimelineAssessment) => (a.courseId ? (index.get(a.courseId) ?? -1) : -1);
  const regular = sortAssessments(
    assessments.filter((a) => !a.makeup),
    due,
  );

  let previousDue = -1;
  return regular.map((a): TimelineRow => {
    const r = due(a);
    const place = a.role ? "Projet fil rouge" : "Hors projet";
    const weight = a.isGroupGrade ? "groupe ×1" : "individuelle ×3";
    const base = { assessmentId: a.id, title: a.title };
    if (r < 0) {
      return {
        ...base,
        subtitle: `${place} · ${weight} · pas encore rattachée à une séance`,
        dueSession: null,
        cells: [],
      };
    }
    const cells: TimelineCell[] = [];
    if (a.role === "milestone") {
      const start = previousDue >= 0 && previousDue < r ? previousDue : 0;
      if (start < r) cells.push({ col: start, span: 1, kind: "launch", label: "Lancé : brief" });
      if (r - start > 1) {
        cells.push({
          col: start + 1,
          span: r - start - 1,
          kind: "work",
          label: "Travail en groupe",
        });
      }
      cells.push({ col: r, span: 1, kind: "due", label: "Rendu + retours" });
      previousDue = r;
    } else if (a.role === "oral") {
      const prep = Math.min(2, r);
      if (prep > 0) {
        cells.push({ col: r - prep, span: prep, kind: "work", label: "Préparation de l'oral" });
      }
      cells.push({ col: r, span: 1, kind: "oral", label: "Passage des groupes" });
    } else {
      cells.push({ col: r, span: 1, kind: "solo", label: "Rendu de fichiers, ou QCM" });
    }
    return {
      ...base,
      subtitle: `${place} · ${weight} · séance ${r + 1}`,
      dueSession: r + 1,
      cells,
    };
  });
}

/** Colonnes d'une ligne de la grille : (start, span) sur les séances. */
export function courseHeader(
  course: TimelineCourse,
  number: number,
): { number: number; when: string } {
  const when = course.date
    ? new Date(`${course.date}T12:00:00`).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
      })
    : "sans date";
  return { number, when };
}

export function courseCellLabel(course: TimelineCourse): { text: string; todo: boolean } {
  if (course.toBuild) {
    return {
      text: isPlaceholderTitle(course.title) ? "À construire" : `${course.title} à construire`,
      todo: true,
    };
  }
  return { text: isPlaceholderTitle(course.title) ? course.title : course.title, todo: false };
}

export interface FrameInput {
  objective: string | null;
  subject: string | null;
  deliverableMd: string | null;
  evaluatedMd: string | null;
  isOral: boolean;
  date: string | null;
  oralStartTime: string | null;
}

export interface Status {
  tone: "ok" | "warn" | "build";
  label: string;
}

const blank = (v: string | null) => !v || !v.trim();

/** « Cadre pour les étudiant·es » : complet, à compléter (avec ce qui manque) ou à écrire. */
export function frameStatus(f: FrameInput): Status {
  const missing: string[] = [];
  if (blank(f.objective)) missing.push("objectif");
  if (blank(f.subject)) missing.push("consigne");
  if (blank(f.deliverableMd)) missing.push("rendu attendu");
  if (blank(f.evaluatedMd)) missing.push("ce qui est évalué");
  if (f.isOral) {
    if (!f.date) missing.push("date");
    if (blank(f.oralStartTime)) missing.push("heure");
  }
  if (missing.length === 0) return { tone: "ok", label: "Complet" };
  const contentMissing = missing.filter((m) => !["date", "heure"].includes(m));
  if (contentMissing.length === 4) return { tone: "build", label: "À écrire" };
  return { tone: "build", label: `À compléter : ${missing.join(", ")}` };
}

/** « Grille de correction » : associée (nom) ou à créer. */
export function gridStatus(gridName: string | null): Status {
  return gridName ? { tone: "ok", label: gridName } : { tone: "warn", label: "À créer" };
}
