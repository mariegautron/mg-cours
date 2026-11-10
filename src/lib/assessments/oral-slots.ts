import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * `true` si chaque groupe visé par l'oral a son créneau dans l'ordre de passage : l'espace de
 * l'oral (« Faire passer l'oral ») couvre alors toutes les copies, il sert aussi à corriger après
 * coup. Sinon, un groupe sans créneau ne se corrige que depuis la correction classique.
 */
export async function oralCoversAllGroups(
  assessmentId: string,
  groupIds: readonly string[],
): Promise<boolean> {
  if (groupIds.length === 0) return false;
  const supabase = await createClient();
  const { data } = await supabase
    .from("oral_slot")
    .select("student_group_id")
    .eq("assessment_id", assessmentId);
  const slotted = new Set((data ?? []).map((r) => r.student_group_id));
  return groupIds.every((g) => slotted.has(g));
}
