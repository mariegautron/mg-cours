"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { copyAssessmentFiles } from "@/lib/assessments/copy-files";
import { failure, NOT_FOUND } from "@/lib/messages";
import { planAssessmentCopy } from "@/lib/modules/duplicate-evaluations";
import { parseResourceFiles } from "@/lib/resources/files";
import { createClient } from "@/lib/supabase/server";

/**
 * Reprendre une évaluation d'un autre module : sujet, grille, type, coefficient, fichiers joints.
 * Ni notes, ni copies, ni retour d'expérience ; date, séance et groupes sont à choisir ensuite.
 */
export async function reuseAssessment(moduleId: string, formData: FormData): Promise<void> {
  const sourceId = String(formData.get("sourceId") ?? "");
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data: source } = await supabase
    .from("assessment")
    .select("*")
    .eq("id", sourceId)
    .maybeSingle();
  const { data: target } = await supabase
    .from("module")
    .select("id")
    .eq("id", moduleId)
    .maybeSingle();
  if (!source || !target || !auth.user) {
    redirect(
      `/modules/${moduleId}/assessments/add?erreur=${encodeURIComponent(NOT_FOUND.assessment)}`,
    );
  }
  const plan = planAssessmentCopy(source, { moduleId, courseIds: new Map(), projectId: null });
  const { data: created, error } = await supabase
    .from("assessment")
    .insert({ ...plan, prep_status: "to_build", date: null })
    .select("id")
    .single();
  if (error || !created) {
    redirect(
      `/modules/${moduleId}/assessments/add?erreur=${encodeURIComponent(failure("reprendre l’évaluation"))}`,
    );
  }
  const { copied } = await copyAssessmentFiles(
    supabase,
    auth.user.id,
    parseResourceFiles(source.files),
    created.id,
  );
  if (copied.length)
    await supabase.from("assessment").update({ files: copied }).eq("id", created.id);
  revalidatePath(`/modules/${moduleId}/assessments`);
  redirect(`/modules/${moduleId}/assessments/${created.id}/edit`);
}
