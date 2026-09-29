"use server";

import { readPdfText } from "@/app/(app)/modules/pdf-text";
import { parseFiche, type FicheData } from "@/lib/modules/fiche";
import { createClient } from "@/lib/supabase/server";

export interface FicheResult {
  error?: string;
  data?: FicheData;
}

/** Lit le texte d'une fiche pédagogique PDF et propose des valeurs pour le formulaire module. */
export async function extractFiche(formData: FormData): Promise<FicheResult> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Session expirée." };

  const pdf = await readPdfText(formData.get("file"));
  if ("error" in pdf) return { error: pdf.error };

  const { data: schools } = await supabase.from("school").select("name");
  const data = parseFiche(
    pdf.text,
    (schools ?? []).map((s) => s.name),
  );
  if (Object.keys(data).length === 0) {
    return {
      error: "Rien d’exploitable trouvé dans ce PDF. Saisis les informations à la main.",
    };
  }
  return { data };
}
