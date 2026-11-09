import "server-only";

import { listModuleAssessments } from "@/lib/assessments/queries";
import { isProgressReview } from "@/lib/assessments/progress-review";
import { createClient } from "@/lib/supabase/server";

/** Évaluations notées du module auxquelles un point d'étape peut se rattacher. */
export async function listReviewTargets(moduleId: string, exceptId?: string) {
  const assessments = await listModuleAssessments(moduleId);
  return assessments
    .filter((a) => a.id !== exceptId && !a.makeup_of_id && !a.is_bonus && !isProgressReview(a))
    .map((a) => ({
      id: a.id,
      title: a.title,
      gradingGridId: a.grading_grid_id,
      isGroup: a.is_group_grade,
    }));
}

/** Retours terminés (ou publiés) par point d'étape. Table absente : aucun. */
export async function countDoneReviews(assessmentIds: readonly string[]) {
  const out = new Map<string, number>();
  if (assessmentIds.length === 0) return out;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("progress_review")
      .select("assessment_id, state")
      .in("assessment_id", [...assessmentIds])
      .eq("state", "done");
    if (error) return out;
    for (const r of data ?? []) out.set(r.assessment_id, (out.get(r.assessment_id) ?? 0) + 1);
  } catch {
    // Base pas encore à jour : aucun retour.
  }
  return out;
}
