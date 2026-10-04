"use server";

import { revalidatePath } from "next/cache";

import { validSelection } from "@/lib/assessments/evaluated-expectations";
import { failure, NOT_FOUND, SESSION_EXPIRED } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

export interface ExpectationsState {
  error?: string;
  saved?: number;
}

/** Remplace les attendus évalués d'une évaluation par la sélection reçue (attendus du module seulement). */
export async function saveAssessmentExpectations(
  moduleId: string,
  assessmentId: string,
  chosen: string[],
): Promise<ExpectationsState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: SESSION_EXPIRED };

  const [{ data: assessment }, { data: expectations }] = await Promise.all([
    supabase
      .from("assessment")
      .select("id")
      .eq("id", assessmentId)
      .eq("module_id", moduleId)
      .maybeSingle(),
    supabase.from("module_expectation").select("id").eq("module_id", moduleId),
  ]);
  if (!assessment) return { error: NOT_FOUND.assessment };
  const ids = validSelection(
    chosen,
    (expectations ?? []).map((e) => e.id),
  );

  const { error: deleteError } = await supabase
    .from("assessment_expectation")
    .delete()
    .eq("assessment_id", assessmentId);
  if (deleteError) {
    return {
      error: "Cette fonction sera disponible après la mise à jour de la base de données.",
    };
  }
  if (ids.length) {
    const { error } = await supabase.from("assessment_expectation").insert(
      ids.map((module_expectation_id) => ({
        assessment_id: assessmentId,
        module_expectation_id,
      })),
    );
    if (error) return { error: failure("enregistrer les attendus") };
  }
  revalidatePath(`/modules/${moduleId}`, "layout");
  return { saved: ids.length };
}
