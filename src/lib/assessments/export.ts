import { canPresent, subjectSections, type SubjectSection } from "@/lib/assessments/subject";
import { matchesRule } from "@/lib/quiz/draw";
import type { BankQuestion, DrawRule } from "@/lib/quiz/types";
import type { GridHandout, HandoutCriterion } from "@/lib/assessments/grid-handout";

/**
 * Export « Évaluations formatives » (dépôt Moodle) : par évaluation, un sujet, des critères et
 * modalités, une correction type. Fonctions pures. Rien de ce qui vient d'une correction réelle
 * (notes, commentaires), du carnet ou d'un QCM (questions, corrigés) n'a de champ ici.
 */
export interface ExportableAssessment {
  id: string;
  title: string;
  makeup_of_id: string | null;
  prep_status: Parameters<typeof canPresent>[0];
  date: string | null;
  position?: number;
}

/** Évaluations à exporter : ni rattrapage ni sujet « à construire », dans l'ordre de la date. */
export function exportableAssessments<T extends ExportableAssessment>(list: readonly T[]): T[] {
  return list
    .filter((a) => !a.makeup_of_id && canPresent(a.prep_status))
    .sort(
      (a, b) =>
        (a.date ?? "9999").localeCompare(b.date ?? "9999") || a.title.localeCompare(b.title, "fr"),
    );
}

/** Sections du sujet (objectif, consigne, rendu attendu, ce qui est évalué) ; vide : pas de fichier. */
export function subjectParts(input: Parameters<typeof subjectSections>[0]): SubjectSection[] {
  return subjectSections(input);
}

/** Critères qui portent des attendus ou une référence : la matière de la « correction type ». */
export function correctionCriteria(handout: GridHandout): HandoutCriterion[] {
  return handout.axes
    .flatMap((a) => a.criteria)
    .filter((c) => (c.description?.trim() ?? "") !== "" || (c.reference?.trim() ?? "") !== "");
}

/**
 * Questions du QCM d'une évaluation pour sa correction type (réponses attendues et retours) :
 * celles de la réserve du QCM qui correspondent à au moins une de ses règles de tirage.
 */
export function qcmCorrectionQuestions(
  bank: readonly BankQuestion[],
  rules: readonly DrawRule[],
): BankQuestion[] {
  return bank
    .filter(
      (q) => q.type !== "open" && (rules.length === 0 || rules.some((r) => matchesRule(q, r))),
    )
    .sort((a, b) => a.name.localeCompare(b.name, "fr", { numeric: true }));
}

export type AssessmentPart = "subject" | "criteria" | "correction" | "qcm";

export const PART_FILES: Record<AssessmentPart, string> = {
  subject: "sujet.pdf",
  criteria: "criteres-et-modalites.pdf",
  correction: "correction-type.pdf",
  qcm: "correction-qcm.pdf",
};

export function isAssessmentPart(value: unknown): value is AssessmentPart {
  return value === "subject" || value === "criteria" || value === "correction" || value === "qcm";
}
