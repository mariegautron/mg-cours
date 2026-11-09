"use server";

import { callQuiz, writeQuiz, type PublicQuizState } from "@/lib/quiz/public";
import { regradeAttempt } from "@/lib/quiz/grade-server";
import { hashToken, isWellFormedToken } from "@/lib/quiz/token";
import { createAdminClient, createAnonClient } from "@/lib/supabase/admin";

/** Commence la copie (le chrono démarre ici, côté serveur). */
export async function startQuiz(token: string): Promise<PublicQuizState> {
  return callQuiz("mg_quiz_start", token);
}

/**
 * Les questions sont affichées : le chrono repart de maintenant (une seule fois, juste après
 * « Commencer », sans réponse enregistrée). `null` si la base n'est pas à jour : le chrono garde
 * l'heure limite posée au clic.
 */
export async function beginQuizClock(
  token: string,
): Promise<{ deadlineAt: string | null; serverNow: string } | null> {
  if (!isWellFormedToken(token)) return null;
  try {
    const { data, error } = await createAnonClient().rpc("mg_quiz_clock", {
      p_token_hash: hashToken(token),
    });
    if (error || !data || typeof data !== "object") return null;
    const d = data as { status?: string; deadline_at?: string | null; server_now?: string };
    if (d.status !== "in_progress" || !d.server_now) return null;
    return { deadlineAt: d.deadline_at ?? null, serverNow: d.server_now };
  } catch {
    return null;
  }
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
