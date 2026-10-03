import "server-only";

import { createClient } from "@/lib/supabase/server";

import { resourcesByQuestion } from "./links";

export interface QuestionLinks {
  /** La table existe ; sinon la liaison est indisponible et l'écran le dit. */
  available: boolean;
  pairs: { resourceId: string; questionId: string }[];
}

/** Tous les couples (ressource, question). Tolérant : table absente → `available: false`. */
export async function listQuestionLinks(): Promise<QuestionLinks> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("resource_question")
      .select("resource_id, question_id");
    if (error || !data) return { available: false, pairs: [] };
    return {
      available: true,
      pairs: data.map((r) => ({ resourceId: r.resource_id, questionId: r.question_id })),
    };
  } catch {
    return { available: false, pairs: [] };
  }
}

/** Ressource d'origine de chaque question (titres), pour la banque. */
export async function questionOrigins(): Promise<Map<string, { id: string; title: string }[]>> {
  const { available, pairs } = await listQuestionLinks();
  if (!available || pairs.length === 0) return new Map();
  const supabase = await createClient();
  const { data } = await supabase
    .from("resource")
    .select("id, title")
    .in("id", [...new Set(pairs.map((p) => p.resourceId))]);
  return resourcesByQuestion(pairs, new Map((data ?? []).map((r) => [r.id, r.title])));
}
