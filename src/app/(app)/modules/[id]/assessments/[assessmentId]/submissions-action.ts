"use server";

import { revalidatePath } from "next/cache";

import { normalizeSubmissionUrl, submissionSchema } from "@/lib/projects/submission";
import { createClient } from "@/lib/supabase/server";

export interface SubmissionState {
  error?: string;
  message?: string;
}

/** Enregistre (ou retire, si la date est vide) le rendu d'un groupe pour une évaluation. */
export async function saveSubmission(
  moduleId: string,
  assessmentId: string,
  groupId: string,
  _prev: SubmissionState,
  formData: FormData,
): Promise<SubmissionState> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("assessment_group")
    .select("id", { count: "exact", head: true })
    .eq("assessment_id", assessmentId)
    .eq("student_group_id", groupId);
  if (!count) return { error: "Groupe non visé par cette évaluation." };

  const dateRaw = String(formData.get("receivedOn") ?? "").trim();
  if (!dateRaw) {
    const { error } = await supabase
      .from("project_submission")
      .delete()
      .eq("assessment_id", assessmentId)
      .eq("student_group_id", groupId);
    if (error) return { error: "Enregistrement impossible." };
    revalidatePath(`/modules/${moduleId}/assessments/${assessmentId}`);
    return { message: "Rendu retiré." };
  }
  const parsed = submissionSchema.safeParse({ receivedOn: dateRaw });
  if (!parsed.success) return { error: "Date invalide." };
  const url = normalizeSubmissionUrl(String(formData.get("url") ?? ""));
  if (url === "invalid") return { error: "Le lien doit commencer par http:// ou https://." };

  const { error } = await supabase.from("project_submission").upsert(
    {
      assessment_id: assessmentId,
      student_group_id: groupId,
      received_on: parsed.data.receivedOn,
      url,
    },
    { onConflict: "assessment_id,student_group_id" },
  );
  if (error) return { error: "Enregistrement impossible." };
  revalidatePath(`/modules/${moduleId}/assessments/${assessmentId}`);
  return { message: "Rendu enregistré." };
}
