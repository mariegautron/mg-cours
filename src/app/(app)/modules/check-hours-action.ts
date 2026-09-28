"use server";

import { findInconsistentModules, type FicheValidation } from "@/lib/modules/fiche";
import { createClient } from "@/lib/supabase/server";

export interface InconsistentModule {
  id: string;
  name: string;
  ycode: string | null;
  totalHours: number | null;
  hoursLecture: number | null;
  hoursTd: number | null;
  hoursTp: number | null;
  validation: FicheValidation;
}

/**
 * Verifie tous les modules pour detecter les incoherences d'heures.
 * Retourne la liste des modules problematiques.
 * Ne corrige rien sans accord explicite.
 */
export async function checkAllModulesHours(): Promise<InconsistentModule[]> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];

  const { data: mods, error } = await supabase
    .from("module")
    .select("id, name, ycode, total_hours, hours_lecture, hours_td, hours_tp")
    .order("name", { ascending: true });

  if (error || !mods) return [];

  const inconsistent = findInconsistentModules(mods);

  return inconsistent.map((m) => {
    const modData = mods.find((mod) => mod.id === m.moduleId);
    return {
      id: m.moduleId,
      name: m.moduleName,
      ycode: m.ycode,
      totalHours: modData?.total_hours ?? null,
      hoursLecture: modData?.hours_lecture ?? null,
      hoursTd: modData?.hours_td ?? null,
      hoursTp: modData?.hours_tp ?? null,
      validation: m.validation,
    };
  });
}
