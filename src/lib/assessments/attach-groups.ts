import { createClient } from "@/lib/supabase/server";

/** Évaluations sans aucun groupe : celles qui attendent les groupes à venir. Fonction pure. */
export function ungroupedAssessmentIds(assessmentIds: string[], linkedIds: Iterable<string>) {
  const linked = new Set(linkedIds);
  return assessmentIds.filter((id) => !linked.has(id));
}

/**
 * Les évaluations prévues avant l'arrivée des étudiant·es n'ont pas de groupe. Quand des groupes
 * sont créés, elles les rejoignent : sans cela, il faudrait rouvrir chaque évaluation pour cocher
 * des groupes. Les évaluations qui ont déjà des groupes ne changent pas.
 */
export async function attachGroupsToUngroupedAssessments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  moduleId: string,
  groupIds: string[],
): Promise<void> {
  if (groupIds.length === 0) return;
  const { data: assessments } = await supabase
    .from("assessment")
    .select("id")
    .eq("module_id", moduleId);
  const ids = (assessments ?? []).map((a) => a.id);
  if (ids.length === 0) return;
  const { data: linked } = await supabase
    .from("assessment_group")
    .select("assessment_id")
    .in("assessment_id", ids);
  const waiting = ungroupedAssessmentIds(
    ids,
    (linked ?? []).map((l) => l.assessment_id),
  );
  if (waiting.length === 0) return;
  await supabase
    .from("assessment_group")
    .insert(
      waiting.flatMap((assessment_id) =>
        groupIds.map((student_group_id) => ({ assessment_id, student_group_id })),
      ),
    );
}
