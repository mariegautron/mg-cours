import { canPresent, subjectSections, type SubjectSection } from "@/lib/assessments/subject";
import { matchesRule } from "@/lib/quiz/draw";
import type { BankQuestion, DrawRule } from "@/lib/quiz/types";

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

/**
 * Correction type d'un QCM, par thème (une règle de tirage = un thème) : les questions tirables
 * avec leur corrigé. Les questions ouvertes y sont (leur retour général est la réponse attendue).
 */
export interface QcmTheme {
  label: string;
  questions: BankQuestion[];
}

export function qcmCorrectionThemes(
  bank: readonly BankQuestion[],
  rules: readonly DrawRule[],
): QcmTheme[] {
  const byName = (a: BankQuestion, b: BankQuestion) =>
    a.name.localeCompare(b.name, "fr", { numeric: true });
  if (rules.length === 0) {
    return bank.length ? [{ label: "Questions", questions: [...bank].sort(byName) }] : [];
  }
  return rules
    .map((rule, i) => ({
      label: rule.category?.trim() || rule.tags.join(", ") || `Thème ${i + 1}`,
      questions: bank.filter((q) => matchesRule(q, rule)).sort(byName),
    }))
    .filter((t) => t.questions.length > 0);
}

export type AssessmentPart = "subject" | "criteria" | "correction";

export const PART_FILES: Record<AssessmentPart, string> = {
  subject: "sujet.pdf",
  criteria: "criteres-et-modalites.pdf",
  correction: "correction-type.pdf",
};

export function isAssessmentPart(value: unknown): value is AssessmentPart {
  return value === "subject" || value === "criteria" || value === "correction";
}
