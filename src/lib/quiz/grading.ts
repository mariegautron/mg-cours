import type { DrawnQuestion, StoredAnswer } from "@/lib/quiz/types";

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Nombre saisi par l'étudiant·e : virgule ou point, espaces (et espaces insécables) tolérés. */
export function parseNumber(raw: string): number | null {
  const t = raw.replace(/[\s  ]/g, "").replace(",", ".");
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Réponse stockée, relue défensivement (le contenu vient d'un navigateur). */
export function readAnswer(raw: unknown, question: DrawnQuestion): StoredAnswer | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (question.type === "open") return typeof r.text === "string" ? { text: r.text } : null;
  if (question.type === "numerical")
    return typeof r.number === "string" ? { number: r.number } : null;
  if (!Array.isArray(r.choices)) return null;
  const ids = [...new Set(r.choices.filter((c): c is number => Number.isInteger(c)))].filter(
    (c) => c >= 0 && c < question.choices.length,
  );
  return { choices: ids };
}

export interface QuestionGrade {
  position: number;
  /** Points obtenus ; `null` pour une réponse libre pas encore relue. */
  earned: number | null;
  max: number;
  /** Réponse libre en attente de relecture. */
  pending: boolean;
}

/**
 * Correction automatique d'une question.
 *  · choix unique / vrai-faux : la fraction du choix coché (toute case en plus = 0) ;
 *  · choix multiples : somme des fractions des cases cochées (pénalités comprises), bornée à [0, 1] ;
 *  · numérique : |réponse − attendu| ≤ tolérance ; réponse illisible ou vide = 0 ;
 *  · réponse libre : jamais corrigée automatiquement.
 */
export function gradeQuestion(
  question: DrawnQuestion,
  position: number,
  rawAnswer: unknown,
  manual?: number,
): QuestionGrade {
  const max = question.points;
  const answer = readAnswer(rawAnswer, question);

  if (question.type === "open") {
    if (manual === undefined || !Number.isFinite(manual))
      return { position, earned: null, max, pending: true };
    return { position, earned: round2(Math.min(max, Math.max(0, manual))), max, pending: false };
  }

  let ratio = 0;
  if (question.type === "numerical") {
    const value = answer && "number" in answer ? parseNumber(answer.number) : null;
    const expected = question.numeric_value;
    if (value !== null && expected !== null) {
      ratio = Math.abs(value - expected) <= (question.numeric_tolerance ?? 0) + 1e-9 ? 1 : 0;
    }
  } else if (answer && "choices" in answer && answer.choices.length) {
    const picked = answer.choices;
    if (question.type === "multiple_choice") {
      ratio = picked.reduce((s, id) => s + question.choices[id].fraction, 0);
    } else {
      ratio = picked.length === 1 ? question.choices[picked[0]].fraction : 0;
    }
    ratio = Math.min(1, Math.max(0, ratio));
  }
  return { position, earned: round2(ratio * max), max, pending: false };
}

export interface AttemptGrade {
  questions: QuestionGrade[];
  /** Points des questions corrigées (automatiques + relues). */
  score: number;
  /** Points des seules questions automatiques. */
  autoScore: number;
  totalPoints: number;
  /** Plus aucune réponse libre à relire : la note est définitive. */
  complete: boolean;
}

export function gradeAttempt(
  drawn: readonly DrawnQuestion[],
  answers: Record<string, unknown>,
  manual: Record<string, unknown> = {},
): AttemptGrade {
  const questions = drawn.map((q, i) => {
    const position = i + 1;
    const m = manual[String(position)];
    return gradeQuestion(
      q,
      position,
      answers[String(position)],
      typeof m === "number" ? m : undefined,
    );
  });
  const sum = (list: QuestionGrade[]) => round2(list.reduce((s, g) => s + (g.earned ?? 0), 0));
  return {
    questions,
    score: sum(questions),
    autoScore: sum(questions.filter((_, i) => drawn[i].type !== "open")),
    totalPoints: round2(drawn.reduce((s, q) => s + q.points, 0)),
    complete: questions.every((g) => !g.pending),
  };
}

/** Corrigé destiné à l'étudiant·e (stocké dans `quiz_attempt.result`, servi seulement une fois le QCM fermé). */
export interface ReviewItem {
  position: number;
  earned: number | null;
  max: number;
  /** Indices (dans l'ordre affiché) des bonnes réponses. */
  correct: number[];
  /** Ce que l'étudiant·e avait coché. */
  chosen: number[];
  expected_number: number | null;
  tolerance: number | null;
  /** Retours des choix cochés. */
  feedback: string[];
  general_feedback: string;
}

export function buildReview(
  drawn: readonly DrawnQuestion[],
  grades: readonly QuestionGrade[],
  answers: Record<string, unknown>,
): ReviewItem[] {
  return drawn.map((q, i) => {
    const answer = readAnswer(answers[String(i + 1)], q);
    const chosen = answer && "choices" in answer ? answer.choices : [];
    return {
      position: i + 1,
      earned: grades[i].earned,
      max: grades[i].max,
      correct: q.choices.flatMap((c, k) => (c.fraction > 0 ? [k] : [])),
      chosen,
      expected_number: q.type === "numerical" ? q.numeric_value : null,
      tolerance: q.type === "numerical" ? q.numeric_tolerance : null,
      feedback: chosen.map((k) => q.choices[k].feedback).filter(Boolean),
      general_feedback: q.general_feedback,
    };
  });
}
