import "server-only";

import { clientIp, recordFailure } from "@/lib/quiz/public";
import { hashToken, isWellFormedToken } from "@/lib/quiz/token";
import { createAnonClient } from "@/lib/supabase/admin";

import { parseEspace, type Espace } from "./espace";
import { parseFrise, type Frise } from "./frise";

export type PublicFrise =
  | { status: "ok"; frise: Frise; espace: Espace | null; publishedAt: string | null }
  | { status: "invalid" | "throttled" | "unavailable" };

/**
 * Lecture publique de la frise par jeton : UNE fonction SQL anonyme (`mg_module_view`) avec le
 * HACHÉ du jeton, qui ne renvoie que l'instantané du lien. Les jetons invalides comptent dans la
 * limite par IP partagée avec le QCM et les résultats.
 */
export async function callModuleFrise(token: string, count = true): Promise<PublicFrise> {
  const ip = await clientIp();
  if (!isWellFormedToken(token)) {
    return { status: (await recordFailure(ip)) ? "throttled" : "invalid" };
  }
  const { data, error } = await createAnonClient().rpc("mg_module_view", {
    p_token_hash: hashToken(token),
    p_count: count,
  });
  if (error || !data || typeof data !== "object") return { status: "unavailable" };
  const row = data as { status?: string; payload?: unknown; published_at?: string };
  if (row.status !== "ok") return { status: (await recordFailure(ip)) ? "throttled" : "invalid" };
  const frise = parseFrise(row.payload);
  if (!frise) return { status: "invalid" };
  return {
    status: "ok",
    frise,
    espace: parseEspace(row.payload),
    publishedAt: row.published_at ?? null,
  };
}
