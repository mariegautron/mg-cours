"use server";

import { cleanAppreciation, validateLength } from "@/lib/appreciations/appreciation";
import { failure } from "@/lib/messages";
import { getSchoolRulesForModule } from "@/lib/settings/rules-queries";
import { createClient } from "@/lib/supabase/server";

export interface AppreciationState {
  error?: string;
  savedAt?: string;
}

/**
 * Enregistre (ou efface) l'appréciation d'un·e étudiant·e pour un module (US-149a). Texte écrit à
 * la main : rien n'est généré. La longueur maximale est celle de l'école du module.
 */
export async function saveAppreciation(
  moduleId: string,
  studentId: string,
  text: string,
): Promise<AppreciationState> {
  const cleaned = cleanAppreciation(text);
  const { appreciationMax } = await getSchoolRulesForModule(moduleId);
  const check = validateLength(cleaned, appreciationMax);
  if (!check.ok) return { error: check.message };

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
