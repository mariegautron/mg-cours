import { createClient } from "@/lib/supabase/server";
import type { QuestionInput } from "@/lib/questions/types";
import { normalizeChoices } from "@/lib/questions/validate";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const choiceRows = (questionId: string, input: QuestionInput) =>
  normalizeChoices(input).map((c, position) => ({
    question_id: questionId,
    position,
    text: c.text,
    fraction: c.fraction,
    is_correct: c.fraction > 0,
    feedback: c.feedback,
  }));

const questionColumns = (input: QuestionInput) => ({
  category: input.category,
  name: input.name,
  type: input.type,
  statement: input.statement,
  general_feedback: input.generalFeedback,
  default_points: input.defaultPoints,
  tags: input.tags,
  numeric_value: input.type === "numerical" ? input.numericValue : null,
  numeric_tolerance: input.type === "numerical" ? input.numericTolerance : null,
});

/** Crée une question et ses choix ; si les choix échouent, la question n'est pas laissée à moitié. */
export async function insertQuestion(
  supabase: Supabase,
  input: QuestionInput,
): Promise<{ id: string } | { error: string }> {
  const { data, error } = await supabase
    .from("question")
    .insert(questionColumns(input))
    .select("id")
    .single();
  if (error || !data) return { error: `la question n’a pas pu être créée (${error?.message})` };
  const rows = choiceRows(data.id, input);
  if (rows.length) {
    const { error: choiceError } = await supabase.from("question_choice").insert(rows);
    if (choiceError) {
      await supabase.from("question").delete().eq("id", data.id);
      return { error: `les choix n’ont pas pu être créés (${choiceError.message})` };
    }
  }
  return { id: data.id };
}

/** Met à jour une question ; en cas d'échec sur les choix, les anciens sont remis. */
export async function updateQuestion(
  supabase: Supabase,
  id: string,
  input: QuestionInput,
): Promise<{ error?: string }> {
  const { error } = await supabase.from("question").update(questionColumns(input)).eq("id", id);
  if (error) return { error: `la question n’a pas pu être enregistrée (${error.message})` };
  const { data: old } = await supabase.from("question_choice").select("*").eq("question_id", id);
  await supabase.from("question_choice").delete().eq("question_id", id);
  const rows = choiceRows(id, input);
  if (rows.length) {
    const { error: choiceError } = await supabase.from("question_choice").insert(rows);
    if (choiceError) {
      if (old?.length) await supabase.from("question_choice").insert(old);
      return { error: `les choix n’ont pas pu être enregistrés (${choiceError.message})` };
    }
  }
  return {};
}
