"use server";

import { extractText } from "unpdf";

import { parseFiche, type FicheData } from "@/lib/modules/fiche";
import { createClient } from "@/lib/supabase/server";

export interface FicheResult {
  error?: string;
  data?: FicheData;
}

// Les Server Actions de Vercel plafonnent le corps à ~4,5 Mo.
const MAX_BYTES = 4 * 1024 * 1024;

/** Lit le texte d'une fiche pédagogique PDF et propose des valeurs pour le formulaire module. */
export async function extractFiche(formData: FormData): Promise<FicheResult> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Session expirée." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choisissez un fichier PDF." };
  if (file.size > MAX_BYTES) return { error: "Fichier trop volumineux (4 Mo maximum)." };
  if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) {
    return { error: "Seuls les fichiers PDF sont lus." };
  }

  let text: string;
  try {
    const result = await extractText(new Uint8Array(await file.arrayBuffer()), {
      mergePages: true,
    });
    text = result.text;
  } catch {
    return { error: "Ce PDF n’a pas pu être lu." };
  }
  if (text.trim().length < 20) {
    return { error: "Aucun texte trouvé (PDF scanné ?). Saisissez les informations à la main." };
  }

  const { data: schools } = await supabase.from("school").select("name");
  const data = parseFiche(
    text,
    (schools ?? []).map((s) => s.name),
  );
  if (Object.keys(data).length === 0) {
    return {
      error: "Rien d’exploitable trouvé dans ce PDF. Saisissez les informations à la main.",
    };
  }
  return { data };
}
