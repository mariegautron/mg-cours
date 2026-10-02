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
