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

/** Déroulement d'un QCM pour le sujet : durée, consignes, thèmes tirés au sort et barème. Aucune question. */
export interface QcmPlan {
  durationMinutes: number | null;
  instructions: string;
  themes: { label: string; count: number; pointsEach: number }[];
  totalPoints: number;
}

export function buildQcmPlan(quiz: {
  duration_minutes: number | null;
  instructions: string;
  rules: readonly DrawRule[];
}): QcmPlan | null {
  if (quiz.rules.length === 0 && !quiz.instructions.trim()) return null;
  const themes = quiz.rules.map((r, i) => ({
    label: r.category?.trim() || r.tags.join(", ") || `Thème ${i + 1}`,
    count: r.count,
    pointsEach: r.pointsEach,
  }));
  return {
    durationMinutes: quiz.duration_minutes,
    instructions: quiz.instructions.trim(),
    themes,
    totalPoints: themes.reduce((n, t) => n + t.count * t.pointsEach, 0),
  };
}

/** Contexte d'un projet fil rouge, lisible par l'école : brief, contexte client, jalons, mails du client. */
export interface ProjectContext {
  title: string;
  briefMd: string;
  clientContextMd: string;
  milestones: {
    title: string;
    role: string | null;
    sessionNumber: number | null;
    date: string | null;
    time: string | null;
  }[];
  mails: { title: string; body: string; sessionNumber: number | null; date: string | null }[];
}

/** Jalons et mails dans l'ordre des séances ; sans séance, à la fin. */
export function buildProjectContext(input: {
  title: string;
  briefMd: string | null;
  clientContextMd: string | null;
  milestones: ProjectContext["milestones"];
  mails: ProjectContext["mails"];
}): ProjectContext {
  const bySession = <T extends { sessionNumber: number | null }>(a: T, b: T) =>
    (a.sessionNumber ?? 999) - (b.sessionNumber ?? 999);
  return {
    title: input.title,
    briefMd: input.briefMd?.trim() ?? "",
    clientContextMd: input.clientContextMd?.trim() ?? "",
    milestones: [...input.milestones].sort(bySession),
    mails: [...input.mails].sort(bySession),
  };
}

export type AssessmentPart = "subject" | "criteria" | "correction" | "context";

export const PART_FILES: Record<AssessmentPart, string> = {
  subject: "sujet.pdf",
  criteria: "criteres-et-modalites.pdf",
  correction: "correction-type.pdf",
  context: "contexte-du-projet.pdf",
};

export function isAssessmentPart(value: unknown): value is AssessmentPart {
  return (
    value === "subject" || value === "criteria" || value === "correction" || value === "context"
  );
}
