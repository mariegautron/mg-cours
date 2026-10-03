import "server-only";

import { clientIp, recordFailure } from "@/lib/quiz/public";
import { hashToken, isWellFormedToken } from "@/lib/quiz/token";
import { createAnonClient } from "@/lib/supabase/admin";

import { parsePublicSheet, type PublicSheet } from "./sheet";

export type PublicResult =
  | { status: "ok"; sheet: PublicSheet; publishedAt: string | null }
  | { status: "invalid" | "throttled" | "unavailable" };

/**
 * Lecture publique d'un résultat par jeton. Ce que le serveur appelle : UNE fonction SQL anonyme
 * (`mg_result_view`) avec le HACHÉ du jeton ; elle ne renvoie que l'instantané de ce lien. Aucune
 * autre table n'est lue, aucun client à droits complets n'intervient ici. Les jetons invalides
 * comptent dans la limite par IP partagée avec le QCM ; un jeton valide n'est jamais compté.
 */
export async function callResult(token: string, count = true): Promise<PublicResult> {
  const ip = await clientIp();
  if (!isWellFormedToken(token)) {
    return { status: (await recordFailure(ip)) ? "throttled" : "invalid" };
  }
  const { data, error } = await createAnonClient().rpc("mg_result_view", {
    p_token_hash: hashToken(token),
    p_count: count,
  });
  if (error || !data || typeof data !== "object") return { status: "unavailable" };
  const row = data as { status?: string; payload?: unknown; published_at?: string };
  if (row.status !== "ok") {
    return { status: (await recordFailure(ip)) ? "throttled" : "invalid" };
  }
  const sheet = parsePublicSheet(row.payload);
  if (!sheet) return { status: "invalid" };
  return { status: "ok", sheet, publishedAt: row.published_at ?? null };
}
