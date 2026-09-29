"use server";

import { readPdfText } from "@/app/(app)/modules/pdf-text";
import { parseHyperplanningServices, type HyperplanningService } from "@/lib/modules/hyperplanning";
import { createClient } from "@/lib/supabase/server";
import { SESSION_EXPIRED } from "@/lib/messages";

export interface HyperplanningResult {
  error?: string;
  services?: HyperplanningService[];
  warnings?: string[];
}

/** Lit l'export « Services intervenant » : renvoie les matières trouvées, sans rien écrire. */
export async function readHyperplanning(formData: FormData): Promise<HyperplanningResult> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: SESSION_EXPIRED };

  const pdf = await readPdfText(formData.get("file"));
  if ("error" in pdf) return { error: pdf.error };

  const { services, warnings } = parseHyperplanningServices(pdf.text);
  const withSlots = services.filter((s) => s.slots.length);
  if (!withSlots.length) {
    return {
      error: "Aucun créneau reconnu dans ce PDF. Est-ce bien l’export Hyperplanning des services ?",
    };
  }
  return { services: withSlots, warnings };
}
