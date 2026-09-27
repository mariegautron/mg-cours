import "server-only";

import { createClient } from "@/lib/supabase/server";
import { advanceTo, type IcebergState } from "@/lib/ynov/iceberg";

/** Fait avancer l'état iceberg d'un module jusqu'à `target`, sans jamais reculer. */
export async function advanceModule(moduleId: string, target: IcebergState) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("module")
    .select("iceberg_state")
    .eq("id", moduleId)
    .single();
  if (!data) return;
  const next = advanceTo(data.iceberg_state, target);
  if (next !== data.iceberg_state) {
    await supabase.from("module").update({ iceberg_state: next }).eq("id", moduleId);
  }
}
