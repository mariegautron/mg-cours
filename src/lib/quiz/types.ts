import type { QuestionType } from "@/lib/questions/types";

/** Règle de tirage : « N questions de telle catégorie / tags / types, chacune à X points ». */
export interface DrawRule {
  /** Vide : toutes les catégories. */
  category: string | null;
  /** La question doit porter tous ces tags. */
  tags: string[];
  /** L'un de ces types (vide : tous). */
  types: QuestionType[];
  count: number;
  pointsEach: number;
}

/** Question de la banque, telle que lue pour tirer. */
export interface BankQuestion {
  id: string;
  category: string;
  name: string;
  type: QuestionType;
  statement: string;
  generalFeedback: string;
  tags: string[];
  numericValue: number | null;
  numericTolerance: number | null;
  choices: { text: string; fraction: number; feedback: string }[];
}

export interface DrawnChoice {
  text: string;
  fraction: number;
  feedback: string;
}

/** Question figée dans une tentative (avec son corrigé : ne va JAMAIS au navigateur avant le corrigé). */
export interface DrawnQuestion {
  question_id: string;
  type: QuestionType;
  statement: string;
  points: number;
  general_feedback: string;
  numeric_value: number | null;
  numeric_tolerance: number | null;
  choices: DrawnChoice[];
}

/** Réponse d'un·e étudiant·e à une question (clés = position 1..N dans `answers`). */
export type StoredAnswer = { choices: number[] } | { text: string } | { number: string };
