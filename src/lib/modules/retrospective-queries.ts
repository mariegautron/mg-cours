import "server-only";

import { createClient } from "@/lib/supabase/server";

/** La table du mot « Ce que je retiens » existe-t-elle ? Sinon le champ n'est pas proposé. */
export async function retrospectiveAvailable(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("module_retrospective").select("id").limit(1);
    return !error;
  } catch {
    return false;
  }
}

/** Mot privé « Ce que je retiens » d'un module ; `null` sans mot ou si la table n'existe pas. */
export async function getRetrospectiveNote(moduleId: string): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("module_retrospective")
      .select("note")
      .eq("module_id", moduleId)
      .maybeSingle();
    if (error) return null;
    return data?.note?.trim() || null;
  } catch {
    return null;
  }
}
