import { createClient } from "@/lib/supabase/server";

/**
 * Attendus évalués, par évaluation. Protégé : sans la table (migration pas encore appliquée),
 * `available` est faux et rien n'est lu ni écrit.
 */
export async function listAssessmentExpectations(
  assessmentIds: string[],
): Promise<{ available: boolean; byAssessment: Map<string, string[]> }> {
  const byAssessment = new Map<string, string[]>();
  if (assessmentIds.length === 0) return { available: true, byAssessment };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("assessment_expectation")
      .select("assessment_id, module_expectation_id")
      .in("assessment_id", assessmentIds);
    if (error || !data) return { available: false, byAssessment };
    for (const row of data) {
      byAssessment.set(row.assessment_id, [
        ...(byAssessment.get(row.assessment_id) ?? []),
        row.module_expectation_id,
      ]);
    }
    return { available: true, byAssessment };
  } catch {
    return { available: false, byAssessment };
  }
}
