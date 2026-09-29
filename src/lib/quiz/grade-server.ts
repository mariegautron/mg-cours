import type { SupabaseClient } from "@supabase/supabase-js";

import { buildReview, gradeAttempt } from "@/lib/quiz/grading";
import type { DrawnQuestion } from "@/lib/quiz/types";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

/**
 * Corrige une copie rendue et range le résultat : points, corrigé destiné à l'étudiant·e, et — une fois
 * toutes les réponses libres relues — la note de l'évaluation. Tant qu'une réponse libre attend d'être
 * relue, la note n'existe pas (ni compteur YNOV, ni moyenne) ; Marie voit le total partiel.
 * Utilisable avec le client de Marie (RLS) ou le client serveur (copie tout juste rendue).
 */
export async function regradeAttempt(
  supabase: Client,
  attemptId: string,
): Promise<{ complete: boolean; score: number; error?: string }> {
  const { data: attempt, error } = await supabase
    .from("quiz_attempt")
    .select("*, quiz:quiz_id(assessment_id)")
    .eq("id", attemptId)
    .maybeSingle();
  if (error || !attempt) return { complete: false, score: 0, error: "Copie introuvable." };

  const drawn = attempt.drawn as unknown as DrawnQuestion[];
  const answers = (attempt.answers ?? {}) as Record<string, unknown>;
  const grade = gradeAttempt(
    drawn,
    answers,
    (attempt.manual_scores ?? {}) as Record<string, unknown>,
  );
  const review = buildReview(drawn, grade.questions, answers);

  const { error: updateError } = await supabase
    .from("quiz_attempt")
    .update({
      auto_score: grade.autoScore,
      score: grade.score,
      review_complete: grade.complete,
      result: { review } as never,
    })
    .eq("id", attemptId);
  if (updateError)
    return {
      complete: false,
      score: grade.score,
      error: `La correction n’a pas pu être enregistrée (${updateError.message}).`,
    };

  const assessmentId = (attempt.quiz as unknown as { assessment_id: string }).assessment_id;
  const { data: existing } = await supabase
    .from("grade")
    .select("id")
    .eq("assessment_id", assessmentId)
    .eq("student_id", attempt.student_id)
    .maybeSingle();

  const value = grade.complete ? grade.score : null;
  if (existing) {
    await supabase.from("grade").update({ value, attendance: "present" }).eq("id", existing.id);
  } else if (value !== null) {
    const { error: insertError } = await supabase.from("grade").insert({
      owner_id: attempt.owner_id,
      assessment_id: assessmentId,
      student_id: attempt.student_id,
      value,
      scores: {},
      attendance: "present",
    });
    if (insertError)
      return {
        complete: grade.complete,
        score: grade.score,
        error: `La note n’a pas pu être enregistrée (${insertError.message}).`,
      };
  }
  return { complete: grade.complete, score: grade.score };
}
