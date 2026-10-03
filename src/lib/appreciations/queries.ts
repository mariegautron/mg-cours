import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface AppreciationsData {
  /** La table existe : sinon la page dit que la fonction arrive après la mise à jour de la base. */
  available: boolean;
  byStudent: Map<string, string>;
}

/** Appréciations d'un module. Protégé : table absente ou erreur → `available: false`. */
export async function listAppreciations(moduleId: string): Promise<AppreciationsData> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("appreciation")
      .select("student_id, text")
      .eq("module_id", moduleId);
    if (error || !data) return { available: false, byStudent: new Map() };
    return { available: true, byStudent: new Map(data.map((r) => [r.student_id, r.text])) };
  } catch {
    return { available: false, byStudent: new Map() };
  }
}
