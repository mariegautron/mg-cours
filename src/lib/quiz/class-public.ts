import "server-only";

import { clientIp, recordFailure } from "@/lib/quiz/public";
import {
  parseClassNames,
  readClaimStatus,
  type ClaimStatus,
  type ClassName,
} from "@/lib/quiz/class-access";
import { generateToken, hashToken, isWellFormedToken } from "@/lib/quiz/token";
import { createAnonClient } from "@/lib/supabase/admin";

export type ClassNames =
  | { status: "ok"; title: string; names: ClassName[] }
  | { status: "not_open" | "window_closed"; title: string; opensAt?: string | null }
  | { status: "invalid" | "throttled" | "unavailable" };

/** Lecture publique des noms libres : une fonction SQL anonyme, haché du lien, limite par IP sur les liens invalides. */
export async function callClassNames(token: string): Promise<ClassNames> {
  const ip = await clientIp();
  if (!isWellFormedToken(token)) {
    return { status: (await recordFailure(ip)) ? "throttled" : "invalid" };
  }
  const { data, error } = await createAnonClient().rpc("mg_quiz_class_names", {
    p_link_hash: hashToken(token),
  });
  if (error || !data || typeof data !== "object") return { status: "unavailable" };
  const row = data as {
    status?: string;
    title?: string;
    names?: unknown;
    opens_at?: string | null;
  };
  if (row.status === "ok") {
    return { status: "ok", title: row.title ?? "QCM", names: parseClassNames(row.names) };
  }
  if (row.status === "not_open" || row.status === "window_closed") {
    return { status: row.status, title: row.title ?? "QCM", opensAt: row.opens_at ?? null };
  }
  return { status: (await recordFailure(ip)) ? "throttled" : "invalid" };
}

/** Prise d'un nom : génère le jeton personnel côté serveur ; il n'est renvoyé qu'en cas de succès. */
export async function claimName(
  linkToken: string,
  attemptId: string,
): Promise<{ status: ClaimStatus; token?: string }> {
  if (!isWellFormedToken(linkToken)) return { status: "invalid" };
  const token = generateToken();
  const { data, error } = await createAnonClient().rpc("mg_quiz_class_claim", {
    p_link_hash: hashToken(linkToken),
    p_attempt_id: attemptId,
    p_new_token_hash: hashToken(token),
  });
  if (error) return { status: "unavailable" };
  const status = readClaimStatus(data);
  return status === "ok" ? { status, token } : { status };
}
