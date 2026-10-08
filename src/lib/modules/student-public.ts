import "server-only";

import { clientIp, recordFailure } from "@/lib/quiz/public";
import { hashToken, isWellFormedToken } from "@/lib/quiz/token";
import { parsePublicSheet, type PublicSheet } from "@/lib/result-links/sheet";
import { createAnonClient } from "@/lib/supabase/admin";

import { parseEspace, type Espace } from "./espace";
import { parseFrise, type Frise } from "./frise";

export type StudentView =
  | {
      status: "ok";
      firstName: string | null;
      /** `null` : l'enseignante n'a pas (encore) publié l'espace du module. */
      content: { frise: Frise; espace: Espace | null; publishedAt: string | null } | null;
      results: { sheet: PublicSheet; publishedAt: string | null }[];
    }
  | { status: "invalid" | "throttled" | "unavailable" };

/**
 * Lecture publique de l'espace d'une personne par son jeton personnel : UNE fonction SQL anonyme
 * (`mg_student_view`) avec le HACHÉ du jeton, qui ne renvoie que le prénom, l'instantané publié du
 * module et les résultats déjà publiés POUR CETTE PERSONNE. Jetons invalides : limite par IP partagée.
 */
export async function callStudentView(token: string, count = true): Promise<StudentView> {
  const ip = await clientIp();
  if (!isWellFormedToken(token)) {
    return { status: (await recordFailure(ip)) ? "throttled" : "invalid" };
  }
  const { data, error } = await createAnonClient().rpc("mg_student_view", {
    p_token_hash: hashToken(token),
    p_count: count,
  });
  if (error || !data || typeof data !== "object") return { status: "unavailable" };
  const row = data as {
    status?: string;
    first_name?: string | null;
    payload?: unknown;
    published_at?: string | null;
    results?: { payload?: unknown; published_at?: string }[];
  };
  if (row.status !== "ok") return { status: (await recordFailure(ip)) ? "throttled" : "invalid" };

  const frise = parseFrise(row.payload);
  const results = (Array.isArray(row.results) ? row.results : []).flatMap((r) => {
    const sheet = parsePublicSheet(r.payload);
    return sheet ? [{ sheet, publishedAt: r.published_at ?? null }] : [];
  });
  return {
    status: "ok",
    firstName: typeof row.first_name === "string" ? row.first_name : null,
    content: frise
      ? { frise, espace: parseEspace(row.payload), publishedAt: row.published_at ?? null }
      : null,
    results,
  };
}
