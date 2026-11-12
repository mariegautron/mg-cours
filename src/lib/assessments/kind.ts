/**
 * Type d'évaluation unique (`assessment.kind`, enum `assessment_kind`, lot 5 du schéma).
 * Fonctions pures. Tant que `kind` est vide (évaluation antérieure, ou base pas à jour), le type est
 * déduit de `type` (texte libre) et de `exam_kind`, lus en secours et jamais supprimés.
 */
import { kindOf } from "@/lib/assessments/individual";
import { SCHOOL_GRADE_TYPE } from "@/lib/assessments/module-notes";

export type AssessmentKind =
  | "files"
  | "quiz"
  | "open_questions"
  | "in_class"
  | "oral"
  | "progress_review"
  | "school_grade"
  | "other";

export interface KindOption {
  value: AssessmentKind;
  /** Libellé du choix dans le formulaire. */
  label: string;
  /** Phrase d'aide sous le choix. */
  hint: string;
  /** Texte écrit dans `type` (lu par le reste de l'appli via `kindOf`). */
  typeLabel: string;
  /** Groupe ou individuel proposé par défaut. */
  defaultGroup: boolean;
  /** Toujours individuelle (le choix groupe / individuel n'est pas proposé). */
  individualOnly: boolean;
}

export const ASSESSMENT_KINDS: readonly KindOption[] = [
  {
    value: "files",
    label: "Rendu de fichiers ou de liens",
    hint: "Projet, dossier, code, maquette : les étudiant·es rendent avant une date.",
    typeLabel: "Rendu de fichiers ou de liens",
    defaultGroup: true,
    individualOnly: false,
  },
  {
    value: "oral",
    label: "Oral",
    hint: "Soutenance ou présentation, avec un ordre de passage.",
    typeLabel: "Oral (groupe ou individuel)",
    defaultGroup: true,
    individualOnly: false,
  },
  {
    value: "progress_review",
    label: "Point d’étape",
    hint: "Un dépôt commenté par critère, non noté par défaut.",
    typeLabel: "Point d’étape",
    defaultGroup: true,
    individualOnly: false,
  },
  {
    value: "quiz",
    label: "QCM en ligne",
    hint: "Questions tirées de ta banque, corrigées automatiquement.",
    typeLabel: "QCM",
    defaultGroup: false,
    individualOnly: true,
  },
  {
    value: "open_questions",
    label: "Questions ouvertes tirées au sort",
    hint: "Étude de cas : réponses rédigées, relues copie par copie.",
    typeLabel: "Questions ouvertes tirées au sort",
    defaultGroup: false,
    individualOnly: true,
  },
  {
    value: "in_class",
    label: "Écrit en classe",
    hint: "Épreuve sur table, pendant une séance.",
    typeLabel: "Écrit en classe",
    defaultGroup: false,
    individualOnly: true,
  },
  {
    value: "school_grade",
    label: "Note de l’école",
    hint: "Note imposée par l’école (contrôle continu) : tu saisis seulement les notes.",
    typeLabel: SCHOOL_GRADE_TYPE,
    defaultGroup: false,
    individualOnly: true,
  },
  {
    value: "other",
    label: "Autre",
    hint: "Rien ne correspond : tout le formulaire reste disponible.",
    typeLabel: "",
    defaultGroup: false,
    individualOnly: false,
  },
];

export const isAssessmentKind = (v: unknown): v is AssessmentKind =>
  ASSESSMENT_KINDS.some((k) => k.value === v);

export const kindOption = (kind: AssessmentKind): KindOption =>
  ASSESSMENT_KINDS.find((k) => k.value === kind) ?? ASSESSMENT_KINDS[ASSESSMENT_KINDS.length - 1];

/** Type d'une évaluation : `kind` s'il est posé, sinon déduit de `type` / `exam_kind` / titre. */
export function assessmentKindOf(a: {
  kind?: string | null;
  type?: string | null;
  exam_kind?: string | null;
  title?: string | null;
}): AssessmentKind {
  if (isAssessmentKind(a.kind)) return a.kind;
  if ((a.type ?? "").trim() === SCHOOL_GRADE_TYPE) return "school_grade";
  const fromType = kindOf(a.type);
  if (fromType === "checkpoint") return "progress_review";
  const title = (a.title ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  if (fromType === "open_questions" || title.includes("etude de cas")) return "open_questions";
  switch (a.exam_kind) {
    case "qcm":
      return "quiz";
    case "oral":
      return "oral";
    case "in_class":
      return "in_class";
    case "files":
      return "files";
  }
  switch (fromType) {
    case "quiz":
      return "quiz";
    case "oral":
      return "oral";
    case "in_class":
      return "in_class";
    case "delivery":
      return "files";
    default:
      return "other";
  }
}

/**
 * Texte à écrire dans `type` : le texte actuel s'il correspond déjà au type choisi (« Oral de
 * groupe » reste tel quel), sinon le libellé du type. « Autre » garde le texte actuel.
 */
export function typeTextForKind(kind: AssessmentKind, current: string | null | undefined): string {
  const text = (current ?? "").trim();
  if (kind === "other") return text;
  if (text && assessmentKindOf({ type: text }) === kind) return text;
  return kindOption(kind).typeLabel;
}

/** Blocs du formulaire et de la page utiles pour ce type. */
export function kindBlocks(kind: AssessmentKind) {
  const school = kind === "school_grade";
  return {
    /** Sujet (objectif, consigne, rendu, ce qui est évalué), séance, état de préparation. */
    subject: !school,
    /** « Où rendre » (rien à rendre pour un oral, un QCM ou une note de l'école). */
    deposit: !school && kind !== "oral" && kind !== "quiz" && kind !== "open_questions",
    /**
     * Un rendu est attendu : section « Rendus déposés », bande « Rendu » de la copie, « Non rendus ».
     * Pas pour un oral, un écrit en classe, un QCM (sa « copie rendue » est suivie à part) ni une
     * note de l'école.
     */
    submissions: kind === "files" || kind === "progress_review" || kind === "other",
    /** Attendus évalués. */
    expectations: !school,
    /** QCM en ligne (« Autre » garde tout). */
    quiz: kind === "quiz" || kind === "open_questions" || kind === "other",
    /** Grille de correction. */
    grid: !school,
    /** Durée de l'épreuve. */
    duration: !school,
    /** Préparation du jour J (statut du sujet, check-list), cadre projeté, présentation. */
    dayJ: !school,
    /** Coefficient imposé par l'école. */
    imposedCoefficient: school,
    /** Rattrapage préparé d'avance, note bonus. */
    makeupAndBonus: !school,
    /** « Quelle épreuve ? » (épreuve individuelle). */
    examKind: !school && kind !== "progress_review",
  };
}

/** `exam_kind` (secours, lu ailleurs) cohérent avec le type choisi. */
export function examKindForKind(kind: AssessmentKind): string | null {
  switch (kind) {
    case "files":
    case "progress_review":
      return "files";
    case "quiz":
    case "open_questions":
      return "qcm";
    case "oral":
      return "oral";
    case "in_class":
      return "in_class";
    default:
      return null;
  }
}
