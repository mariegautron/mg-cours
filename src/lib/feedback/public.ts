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

/** Enregistre une réponse anonyme (jamais comptée dans la limite par IP). */
export async function submitFeedback(
  token: string,
  answers: FeedbackAnswers,
): Promise<"ok" | "invalid" | "unavailable"> {
  if (!isWellFormedToken(token)) return "invalid";
  const { data, error } = await createAnonClient().rpc("mg_feedback_submit", {
    p_link_hash: hashToken(token),
    p_answers: answers as never,
  });
  if (error || !data || typeof data !== "object") return "unavailable";
  const status = (data as { status?: string }).status;
  return status === "ok" ? "ok" : status === "invalid" ? "invalid" : "unavailable";
}
