"use server";

import { createClient } from "@/lib/supabase/server";
import { recordProjection } from "@/app/(present)/present/modules/[id]/courses/[courseId]/presenter/actions";

/**
 * « Commencer le cours » : les éléments gardés « pour moi » sont notés dans le journal de la
 * séance (« Pour moi »), pour que la clôture ne les propose pas à reporter. « Au mieux », comme
 * le journal de projection.
 */
export async function recordKeptForMe(courseId: string, keys: string[]): Promise<void> {
  for (const key of keys.slice(0, 50)) {
    await recordProjection({ courseId, sectionKey: key, resourceId: null, kind: "private" });
  }
}

/**
 * Enregistre avec la séance les éléments « Pour moi » : toute ouverture de la fenêtre projetée
 * les applique, quel que soit le lien utilisé. Les clés inconnues ou trop longues sont ignorées.
 */
export async function saveHiddenKeys(courseId: string, keys: string[]): Promise<void> {
  try {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(courseId)) return;
    const clean = [...new Set(keys.filter((k) => typeof k === "string" && k.length <= 300))].slice(
      0,
      100,
    );
    const supabase = await createClient();
    await supabase.from("course").update({ hidden_keys: clean }).eq("id", courseId);
  } catch {
    // Colonne pas encore migrée ou réseau : le choix reste dans l'adresse des fenêtres.
  }
}
