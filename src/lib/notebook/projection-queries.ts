import "server-only";

import { createClient } from "@/lib/supabase/server";

import type { ProjectionEventInput } from "./projection";

/**
 * Journal de projection d'une séance (US-136). Protégé : si la table n'existe pas encore ou si la
 * lecture échoue, on renvoie un journal vide et la clôture reste utilisable.
 */
export async function listProjectionEvents(courseId: string): Promise<ProjectionEventInput[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("projection_event")
      .select("section_key, resource_id, kind, projected_at")
      .eq("course_id", courseId)
      .order("projected_at");
    if (error || !data) return [];
    return data.map((e) => ({
      sectionKey: e.section_key,
      resourceId: e.resource_id,
      kind: e.kind === "private" ? "private" : "projected",
      projectedAt: e.projected_at,
    }));
  } catch {
    return [];
  }
}
