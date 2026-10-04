import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface ExpectationLinks {
  /** La table existe ; sinon on garde l'ancien calcul par correspondance de mots. */
  available: boolean;
  /** attendu → ressources explicitement associées. */
  byExpectation: Map<string, Set<string>>;
}

/** Liens explicites attendu ↔ ressource d'un module. Tolérant : table absente → `available: false`. */
export async function getExpectationLinks(moduleId: string): Promise<ExpectationLinks> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("expectation_resource")
      .select("expectation_id, resource_id")
      .eq("module_id", moduleId);
    if (error || !data) return { available: false, byExpectation: new Map() };
    const byExpectation = new Map<string, Set<string>>();
    for (const row of data) {
      const set = byExpectation.get(row.expectation_id) ?? new Set<string>();
      set.add(row.resource_id);
      byExpectation.set(row.expectation_id, set);
    }
    return { available: true, byExpectation };
  } catch {
    return { available: false, byExpectation: new Map() };
  }
}
