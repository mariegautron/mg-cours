import "server-only";

import { createClient } from "@/lib/supabase/server";

import type { ViewInfo } from "./sheet";

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
