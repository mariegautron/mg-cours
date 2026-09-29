"use server";

import { callQuiz, writeQuiz, type PublicQuizState } from "@/lib/quiz/public";
import { regradeAttempt } from "@/lib/quiz/grade-server";
import { hashToken } from "@/lib/quiz/token";
import { createAdminClient } from "@/lib/supabase/admin";

/** Commence la copie (le chrono démarre ici, côté serveur). */
export async function startQuiz(token: string): Promise<PublicQuizState> {
  return callQuiz("mg_quiz_start", token);
}

/** Enregistrement automatique : jamais limité, jamais refusé pour une raison autre que « déjà rendue ». */
export async function saveQuiz(token: string, answers: unknown): Promise<PublicQuizState> {
  return writeQuiz("mg_quiz_save", token, answers);
}

/**
 * Rend la copie puis la corrige (client serveur : la copie vient d'être rendue avec un jeton valide, le
 * calcul est fait ici en TypeScript testé, les corrigés ne transitent jamais par le navigateur).
 */
export async function submitQuiz(token: string, answers: unknown): Promise<PublicQuizState> {
  const result = await writeQuiz("mg_quiz_submit", token, answers);
  if (result.status !== "ok") return result;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("quiz_attempt")
      .select("id")
      .eq("token_hash", hashToken(token))
      .maybeSingle();
    if (data) await regradeAttempt(admin, data.id);
  } catch {
    // La copie est rendue et conservée : Marie peut relancer la correction depuis le suivi.
  }
  return result;
}
