import { headers } from "next/headers";

import { hashIp, hashToken, isWellFormedToken } from "@/lib/quiz/token";
import { serverEnv } from "@/lib/env";
import { createAdminClient, createAnonClient } from "@/lib/supabase/admin";

/** Essais avec un jeton invalide tolérés par IP et par fenêtre (une salle de classe partage une IP). */
export const IP_FAILURE_LIMIT = 30;
export const IP_WINDOW_SECONDS = 600;

/** IP du client lue dans l'en-tête posé par la plateforme, jamais dans un paramètre fourni par le client. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const real = h.get("x-real-ip")?.trim();
  if (real) return real;
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || "inconnue";
}

/**
 * Compte un essai avec un jeton invalide. Renvoie `true` si l'IP a dépassé la limite. Ne s'applique
 * QU'AUX jetons invalides : un jeton valide n'est jamais compté ni bloqué.
 */
async function recordFailure(ip: string): Promise<boolean> {
  try {
    const salt = serverEnv().SUPABASE_SERVICE_ROLE_KEY ?? "mg-cours";
    const { data } = await createAdminClient().rpc("mg_quiz_ip_failure", {
      p_ip_hash: hashIp(ip, salt),
      p_limit: IP_FAILURE_LIMIT,
      p_window_seconds: IP_WINDOW_SECONDS,
    });
    return data === true;
  } catch {
    // Compteur indisponible : on ne bloque personne (la limite protège du bruit, pas de la devinette,
    // impossible sur 256 bits).
    return false;
  }
}

export type PublicQuizState = Record<string, unknown> & { status: string };

/** Appelle une fonction SQL anonyme avec le HACHÉ du jeton, et applique la limite par IP aux jetons invalides. */
export async function callQuiz(
  fn: "mg_quiz_session" | "mg_quiz_start",
  token: string,
): Promise<PublicQuizState> {
  const ip = await clientIp();
  if (!isWellFormedToken(token)) {
    return { status: (await recordFailure(ip)) ? "throttled" : "invalid" };
  }
  const { data, error } = await createAnonClient().rpc(fn, { p_token_hash: hashToken(token) });
  if (error || !data || typeof data !== "object") return { status: "unavailable" };
  const state = data as PublicQuizState;
  if (state.status === "invalid") {
    return { status: (await recordFailure(ip)) ? "throttled" : "invalid" };
  }
  return state;
}

/** Enregistrement / soumission : jamais limités, jamais comptés. */
export async function writeQuiz(
  fn: "mg_quiz_save" | "mg_quiz_submit",
  token: string,
  answers: unknown,
): Promise<PublicQuizState> {
  if (!isWellFormedToken(token)) return { status: "invalid" };
  const { data, error } = await createAnonClient().rpc(fn, {
    p_token_hash: hashToken(token),
    p_answers: answers as never,
  });
  if (error || !data || typeof data !== "object") return { status: "unavailable" };
  return data as PublicQuizState;
}
