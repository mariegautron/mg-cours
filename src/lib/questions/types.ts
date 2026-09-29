export const QUESTION_TYPES = [
  "single_choice",
  "multiple_choice",
  "true_false",
  "numerical",
  "open",
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  single_choice: "Choix unique",
  multiple_choice: "Choix multiples",
  true_false: "Vrai / faux",
  numerical: "Numérique",
  open: "Réponse libre",
};

/** Les types corrigés automatiquement ; la réponse libre est relue à la main. */
export function isAutoGraded(type: QuestionType): boolean {
  return type !== "open";
}

export function isQuestionType(value: unknown): value is QuestionType {
  return typeof value === "string" && (QUESTION_TYPES as readonly string[]).includes(value);
}

export interface ChoiceInput {
  text: string;
  /** Points relatifs (−1…1). Les bonnes réponses sont > 0. */
  fraction: number;
  feedback: string;
}

export interface QuestionInput {
  category: string;
  name: string;
  type: QuestionType;
  statement: string;
  generalFeedback: string;
  defaultPoints: number;
  tags: string[];
  choices: ChoiceInput[];
  numericValue: number | null;
  numericTolerance: number | null;
}
