"use server";

import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * US-136 : journal de projection. « Au mieux » : une erreur d'écriture (table pas encore migrée,
 * réseau…) est ignorée, jamais renvoyée, pour ne rien retarder ni bloquer côté projection.
 * `projected` = envoyé à l'écran de la classe ; `private` = « Pour moi ».
 */
export async function recordProjection(input: {
  courseId: string;
  sectionKey: string | null;
  resourceId: string | null;
  kind: "projected" | "private";
}): Promise<void> {
  try {
    const { courseId, sectionKey, resourceId, kind } = input;
    if (!UUID.test(courseId)) return;
    if (kind !== "projected" && kind !== "private") return;
    if (sectionKey !== null && (typeof sectionKey !== "string" || sectionKey.length > 300)) return;
    if (resourceId !== null && !UUID.test(resourceId)) return;
    const supabase = await createClient();
    await supabase.from("projection_event").insert({
      course_id: courseId,
      section_key: sectionKey,
      resource_id: resourceId,
      kind,
    });
  } catch {
    // Ignoré volontairement.
  }
}
