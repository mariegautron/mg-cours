"use server";

import { revalidatePath } from "next/cache";

import { OPQUAST_SCALE, validateScale, type ScaleBand } from "@/lib/assessments/score-scale";
import { failure, NOT_FOUND } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

export interface BonusState {
  error?: string;
  saved?: boolean;
}

/**
 * Fait d'une évaluation individuelle une note bonus de certification (ou l'inverse) et enregistre
 * son barème. Une note bonus est sur 20, ne compte pas dans les notes exigées et ne fait que
 * remonter la moyenne. Sans la migration, on le dit au lieu d'échouer.
 */
export async function saveBonusSettings(
  moduleId: string,
  assessmentId: string,
  input: { isBonus: boolean; bands: ScaleBand[] },
): Promise<BonusState> {
  const bands = input.bands.map((b) => ({
    min: Number(b.min),
    max: Number(b.max),
    points: Number(b.points),
  }));
  if (input.isBonus) {
    const problem = validateScale(bands);
    if (problem) return { error: problem };
  }
  const supabase = await createClient();
  const { data: assessment } = await supabase
    .from("assessment")
    .select("id, is_group_grade")
    .eq("id", assessmentId)
    .eq("module_id", moduleId)
    .maybeSingle();
  if (!assessment) return { error: NOT_FOUND.assessment };
  if (input.isBonus && assessment.is_group_grade) {
    return { error: "Une note bonus est individuelle : cette évaluation est une note de groupe." };
  }
  const { error } = await supabase
    .from("assessment")
    .update({
      is_bonus: input.isBonus,
      score_scale: input.isBonus
        ? JSON.parse(JSON.stringify(bands.length ? bands : OPQUAST_SCALE))
        : null,
      ...(input.isBonus ? { max_score: 20 } : {}),
    })
    .eq("id", assessmentId);
  if (error) {
    return /is_bonus|score_scale/.test(error.message)
      ? { error: "La note bonus sera disponible après la mise à jour de la base de données." }
      : { error: failure("enregistrer") };
  }
  revalidatePath(`/modules/${moduleId}`, "layout");
  return { saved: true };
}
