import "server-only";

import { clientIp, recordFailure } from "@/lib/quiz/public";
import { hashToken, isWellFormedToken } from "@/lib/quiz/token";
import { createAnonClient } from "@/lib/supabase/admin";
import type { FeedbackAnswers } from "@/lib/feedback/questions";

export type FeedbackForm =
  { status: "ok"; moduleName: string } | { status: "invalid" | "throttled" | "unavailable" };

/** Lecture publique : une fonction SQL anonyme, haché du lien, limite par IP sur les liens invalides. */
export async function callFeedbackForm(token: string): Promise<FeedbackForm> {
  const ip = await clientIp();
  if (!isWellFormedToken(token)) {
    return { status: (await recordFailure(ip)) ? "throttled" : "invalid" };
  }
  const { data, error } = await createAnonClient().rpc("mg_feedback_form", {
    p_link_hash: hashToken(token),
  });
  if (error || !data || typeof data !== "object") return { status: "unavailable" };
  const row = data as { status?: string; module_name?: string };
  if (row.status === "ok") return { status: "ok", moduleName: row.module_name ?? "ce module" };
  return { status: (await recordFailure(ip)) ? "throttled" : "invalid" };
}

/**
 * Enregistre une réponse anonyme (jamais comptée dans la limite par IP). `respondent` : jeton
 * aléatoire gardé par le navigateur (haché ici) ; un 2e envoi du même navigateur remplace le 1er.
 * Sans la migration du 1er décembre, on retombe sur l'envoi simple.
 */
export async function submitFeedback(
  token: string,
  answers: FeedbackAnswers,
  respondent?: string | null,
): Promise<"ok" | "updated" | "invalid" | "unavailable"> {
  if (!isWellFormedToken(token)) return "invalid";
  const client = createAnonClient();
  const respondentHash =
    respondent && /^[A-Za-z0-9_-]{16,128}$/.test(respondent) ? hashToken(respondent) : null;
  let data: unknown = null;
  let error: unknown = { message: "sans jeton" };
  if (respondentHash) {
    ({ data, error } = await client.rpc(
      "mg_feedback_submit" as never,
      {
        p_link_hash: hashToken(token),
        p_answers: answers,
        p_respondent_hash: respondentHash,
      } as never,
    ));
  }
  if (error) {
    ({ data, error } = await client.rpc("mg_feedback_submit", {
      p_link_hash: hashToken(token),
      p_answers: answers as never,
    }));
  }
  if (error || !data || typeof data !== "object") return "unavailable";
  const status = (data as { status?: string }).status;
  return status === "ok" || status === "updated" || status === "invalid" ? status : "unavailable";
}
