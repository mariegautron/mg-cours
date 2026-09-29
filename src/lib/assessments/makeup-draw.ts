import { quizTotalPoints } from "@/lib/quiz/draw";
import { createClient } from "@/lib/supabase/server";

/**
 * Point d'accroche « nouveau tirage » du rattrapage d'un QCM (US-96 → US-95).
 *
 * Si l'évaluation d'origine a un QCM, le rattrapage reçoit un QCM identique (mêmes règles, durée, options),
 * en brouillon. Le tirage de chaque étudiant·e se fait à « Préparer les tirages et les liens » du
 * rattrapage : nouvelles questions, en évitant celles déjà vues à la première passation (si la banque est
 * trop petite, des questions déjà vues complètent et Marie voit « 2 sur 10 déjà vues »).
 * Sans QCM d'origine, il n'y a rien à cloner : le rattrapage se prépare comme un sujet ordinaire.
 */
export interface MakeupDrawInput {
  originalId: string;
  makeupId: string;
  studentIds: readonly string[];
}

export interface MakeupDrawResult {
  /** Un QCM de rattrapage existe (cloné maintenant ou déjà là). */
  quiz: boolean;
  warnings: string[];
}

export async function redrawQuizForMakeup(input: MakeupDrawInput): Promise<MakeupDrawResult> {
  const supabase = await createClient();
  const { data: origin } = await supabase
    .from("quiz")
    .select("*, quiz_draw_rule(*)")
    .eq("assessment_id", input.originalId)
    .maybeSingle();
  if (!origin) return { quiz: false, warnings: [] };

  const { data: existing } = await supabase
    .from("quiz")
    .select("id")
    .eq("assessment_id", input.makeupId)
    .maybeSingle();
  if (existing) return { quiz: true, warnings: [] };

  const { data: created, error } = await supabase
    .from("quiz")
    .insert({
      assessment_id: input.makeupId,
      title: `Rattrapage — ${origin.title}`,
      instructions: origin.instructions,
      duration_minutes: origin.duration_minutes,
      show_results: origin.show_results,
      shuffle_questions: origin.shuffle_questions,
      shuffle_choices: origin.shuffle_choices,
    })
    .select("id")
    .single();
  if (error || !created)
    return {
      quiz: false,
      warnings: [`Le QCM de rattrapage n’a pas pu être créé (${error?.message}).`],
    };

  const rules = origin.quiz_draw_rule;
  if (rules.length) {
    await supabase.from("quiz_draw_rule").insert(
      rules.map((r) => ({
        quiz_id: created.id,
        position: r.position,
        category: r.category,
        tags: r.tags,
        types: r.types,
        count: r.count,
        points_each: r.points_each,
      })),
    );
    await supabase
      .from("assessment")
      .update({
        max_score: quizTotalPoints(
          rules.map((r) => ({ count: r.count, pointsEach: Number(r.points_each) })),
        ),
      })
      .eq("id", input.makeupId);
  }
  return { quiz: true, warnings: [] };
}
