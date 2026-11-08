"use server";

import { revalidatePath } from "next/cache";

import { cleanAppreciation } from "@/lib/appreciations/appreciation";
import { failure } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

export interface AppreciationState {
  error?: string;
  savedAt?: string;
}

/**
 * Enregistre (ou efface) l'appréciation d'un·e étudiant·e pour un module (US-149a). Texte écrit à
 * la main : rien n'est généré. Le brouillon est toujours enregistré, même trop long : seule la copie vers Hyperplanning est bloquée.
 */
export async function saveAppreciation(
  moduleId: string,
  studentId: string,
  text: string,
): Promise<AppreciationState> {
  const cleaned = cleanAppreciation(text);

  const supabase = await createClient();
  if (cleaned === "") {
    const { error } = await supabase
      .from("appreciation")
      .delete()
      .eq("module_id", moduleId)
      .eq("student_id", studentId);
    if (error) return { error: failure("enregistrer", { kept: true }) };
  } else {
    const { error } = await supabase
      .from("appreciation")
      .upsert(
        { module_id: moduleId, student_id: studentId, text: cleaned },
        { onConflict: "module_id,student_id" },
      );
    if (error) return { error: failure("enregistrer", { kept: true }) };
  }
  return {
    savedAt: new Date().toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Paris",
    }),
  };
}

/** Coche ou décoche « Reportée dans Hyperplanning » : mémorise le texte reporté pour repérer les modifications ensuite. */
export async function setReported(
  moduleId: string,
  studentId: string,
  reported: boolean,
): Promise<AppreciationState> {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("appreciation")
    .select("text")
    .eq("module_id", moduleId)
    .eq("student_id", studentId)
    .maybeSingle();
  if (!row) return { error: "Écris d’abord l’appréciation." };
  const { error } = await supabase
    .from("appreciation")
    .update({ reported_text: reported ? row.text : null })
    .eq("module_id", moduleId)
    .eq("student_id", studentId);
  if (error) return { error: failure("enregistrer", { kept: true }) };
  revalidatePath(`/modules/${moduleId}/appreciations`);
  return {};
}
