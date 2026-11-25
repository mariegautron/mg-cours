import "server-only";

import { createClient } from "@/lib/supabase/server";

import { mergeMakeupResults, parsePublicSheet, type PublicSheet, type ViewInfo } from "./sheet";

export interface ResultLinksData {
  /** La table existe : sinon « Publier » est indisponible (l'envoi par e-mail reste). */
  available: boolean;
  /** Liens actifs par étudiant·e. */
  byStudent: Map<string, ViewInfo & { published_at: string }>;
}

export async function listResultLinks(assessmentId: string): Promise<ResultLinksData> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("result_link")
      .select("student_id, published_at, first_viewed_at, view_count")
      .eq("assessment_id", assessmentId)
      .is("revoked_at", null);
    if (error || !data) return { available: false, byStudent: new Map() };
    return {
      available: true,
      byStudent: new Map(
        data.map((r) => [
          r.student_id,
          {
            published_at: r.published_at,
            first_viewed_at: r.first_viewed_at,
            view_count: r.view_count,
          },
        ]),
      ),
    };
  } catch {
    return { available: false, byStudent: new Map() };
  }
}

/**
 * Résultats déjà publiés pour UNE personne sur un module, tels que son espace les affiche (mêmes
 * filtres et même ordre que `mg_student_view`). Sert à l'aperçu côté enseignante : aucune vue comptée.
 */
export async function listPublishedSheets(
  moduleId: string,
  studentId: string,
): Promise<{ sheet: PublicSheet; publishedAt: string | null }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("result_link")
    .select("payload, published_at, assessment!inner(module_id)")
    .eq("assessment.module_id", moduleId)
    .eq("student_id", studentId)
    .is("revoked_at", null)
    .order("published_at", { ascending: false });
  return mergeMakeupResults(
    (data ?? []).flatMap((r) => {
      const sheet = parsePublicSheet(r.payload);
      return sheet ? [{ sheet, publishedAt: r.published_at }] : [];
    }),
  );
}
