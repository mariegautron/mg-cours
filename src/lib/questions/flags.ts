/**
 * Repères sur la banque : questions « réponses à définir » (corrigées automatiquement mais sans
 * bonne réponse) et doublons (même énoncé, même type). Fonctions pures.
 */
import { stripMarkdown } from "@/lib/resources/search";
import type { QuestionType } from "@/lib/questions/types";

export interface FlaggableQuestion {
  id: string;
  type: QuestionType;
  statement: string;
  numeric_value: number | string | null;
  choices: { fraction: number | string }[];
  archived_at: string | null;
}

export interface QuestionFlags {
  undefinedAnswer: boolean;
  duplicateOf: number;
}

const norm = (t: string) =>
  stripMarkdown(t)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export function answerIsDefined(q: FlaggableQuestion): boolean {
  if (q.type === "open") return true;
  if (q.type === "numerical") return q.numeric_value !== null && q.numeric_value !== "";
  return q.choices.some((c) => Number(c.fraction) > 0);
}

export function questionFlags(questions: readonly FlaggableQuestion[]): Map<string, QuestionFlags> {
  const groups = new Map<string, number>();
  const keyOf = (q: FlaggableQuestion) => `${q.type}|${norm(q.statement)}`;
  for (const q of questions) {
    if (q.archived_at) continue;
    groups.set(keyOf(q), (groups.get(keyOf(q)) ?? 0) + 1);
  }
  return new Map(
    questions.map((q) => [
      q.id,
      {
        undefinedAnswer: !q.archived_at && !answerIsDefined(q),
        duplicateOf: q.archived_at ? 0 : Math.max(0, (groups.get(keyOf(q)) ?? 1) - 1),
      },
    ]),
  );
}

export const PAGE_SIZE = 50;

export function paginate<T>(items: readonly T[], page: number, size = PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pages);
  return { items: items.slice((current - 1) * size, current * size), page: current, pages };
}
