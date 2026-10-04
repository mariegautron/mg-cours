"use server";

import { revalidatePath } from "next/cache";

import { failure, NOT_FOUND } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

/** « Où rendre » d'une évaluation (texte court, vide pour l'enlever). Sans la colonne, on le dit. */
export async function saveWhereToSubmit(
  moduleId: string,
  assessmentId: string,
  value: string,
): Promise<{ error?: string; value?: string | null }> {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length > 200) return { error: "Où rendre : 200 caractères au plus." };
  const supabase = await createClient();
  const { data: assessment } = await supabase
    .from("assessment")
    .select("id")
    .eq("id", assessmentId)
    .eq("module_id", moduleId)
    .maybeSingle();
  if (!assessment) return { error: NOT_FOUND.assessment };
  const { error } = await supabase
    .from("assessment")
    .update({ where_to_submit: text || null })
    .eq("id", assessmentId);
  if (error) {
    return /where_to_submit/.test(error.message)
      ? { error: "« Où rendre » sera disponible après la mise à jour de la base de données." }
      : { error: failure("enregistrer") };
  }
  revalidatePath(`/modules/${moduleId}`, "layout");
  return { value: text || null };
}
