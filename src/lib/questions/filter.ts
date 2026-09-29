import { normalizeSearch, searchTerms, stripMarkdown } from "@/lib/resources/search";
import { isQuestionType, type QuestionType } from "@/lib/questions/types";

export interface QuestionFilters {
  q: string;
  category: string;
  type: QuestionType | "";
  tag: string;
  archived: boolean;
}

export function readQuestionFilters(
  params: Record<string, string | string[] | undefined>,
): QuestionFilters {
  const one = (k: string) => {
    const v = params[k];
    return (Array.isArray(v) ? v[0] : v) ?? "";
  };
  const type = one("type");
  return {
    q: one("q").trim(),
    category: one("category"),
    type: isQuestionType(type) ? type : "",
    tag: one("tag"),
    archived: one("archived") === "1",
  };
}

export interface FilterableQuestion {
  category: string;
  name: string;
  type: QuestionType;
  statement: string;
  general_feedback: string;
  tags: string[];
  archived_at: string | null;
  choices?: { text: string }[];
}

/** Recherche plein texte (sans accent ni casse, tous les mots) sur nom, catégorie, tags, énoncé, choix. */
export function filterQuestions<T extends FilterableQuestion>(
  questions: readonly T[],
  f: QuestionFilters,
): T[] {
  const terms = searchTerms(f.q);
  return questions.filter((q) => {
    if (f.archived ? !q.archived_at : q.archived_at) return false;
    if (f.category && q.category !== f.category) return false;
    if (f.type && q.type !== f.type) return false;
    if (f.tag && !q.tags.some((t) => normalizeSearch(t) === normalizeSearch(f.tag))) return false;
    if (!terms.length) return true;
    const haystack = normalizeSearch(
      [
        q.name,
        q.category,
        q.tags.join(" "),
        stripMarkdown(q.statement),
        stripMarkdown(q.general_feedback),
        ...(q.choices ?? []).map((c) => stripMarkdown(c.text)),
      ].join(" "),
    );
    return terms.every((t) => haystack.includes(t));
  });
}
