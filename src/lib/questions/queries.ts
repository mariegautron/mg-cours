import { createClient } from "@/lib/supabase/server";
import type { QuestionInput, QuestionType } from "@/lib/questions/types";
import type { Tables } from "@/types/db";

export type QuestionChoiceRow = Tables<"question_choice">;
export type QuestionWithChoices = Tables<"question"> & { choices: QuestionChoiceRow[] };

const byPosition = (a: { position: number }, b: { position: number }) => a.position - b.position;

/** Toute la banque (choix compris), tri par catégorie puis nom : la recherche se fait en mémoire. */
export async function listQuestions(): Promise<QuestionWithChoices[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("question")
    .select("*, choices:question_choice(*)")
    .order("category")
    .order("name");
  return ((data ?? []) as unknown as QuestionWithChoices[]).map((q) => ({
    ...q,
    choices: [...q.choices].sort(byPosition),
  }));
}

export async function getQuestion(id: string): Promise<QuestionWithChoices | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("question")
    .select("*, choices:question_choice(*)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const q = data as unknown as QuestionWithChoices;
  return { ...q, choices: [...q.choices].sort(byPosition) };
}

/** Ligne de base → entrée métier (formulaire, export, duplication). */
export function toQuestionInput(q: QuestionWithChoices): QuestionInput {
  return {
    category: q.category,
    name: q.name,
    type: q.type as QuestionType,
    statement: q.statement,
    generalFeedback: q.general_feedback,
    defaultPoints: Number(q.default_points),
    tags: q.tags,
    choices: q.choices.map((c) => ({
      text: c.text,
      fraction: Number(c.fraction),
      feedback: c.feedback,
    })),
    numericValue: q.numeric_value === null ? null : Number(q.numeric_value),
    numericTolerance: q.numeric_tolerance === null ? null : Number(q.numeric_tolerance),
  };
}
