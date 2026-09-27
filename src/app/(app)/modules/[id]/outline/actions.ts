"use server";

import { revalidatePath } from "next/cache";

import { buildCurrentOutline, getOutline } from "@/lib/outline/queries";
import { advanceModule } from "@/lib/modules/advance";
import { createClient } from "@/lib/supabase/server";

export interface OutlineActionState {
  error?: string;
}

/** Génère (ou rafraîchit) l'instantané de la trame. Ne touche pas au statut d'envoi. */
export async function generateOutline(moduleId: string): Promise<OutlineActionState> {
  const content = await buildCurrentOutline(moduleId);
  if (!content) return { error: "Module introuvable." };

  const supabase = await createClient();
  const existing = await getOutline(moduleId);
  const payload = {
    module_id: moduleId,
    content: JSON.parse(JSON.stringify(content)),
    generated_at: content.generatedAt,
  };

  const { error } = existing
    ? await supabase.from("pedagogical_outline").update(payload).eq("id", existing.id)
    : await supabase.from("pedagogical_outline").insert(payload);
  if (error) return { error: "Génération impossible. Réessayez." };

  await advanceModule(moduleId, "outline_generated");
  revalidatePath(`/modules/${moduleId}`);
  return {};
}

export async function markOutlineSent(moduleId: string): Promise<OutlineActionState> {
  const outline = await getOutline(moduleId);
  if (!outline) return { error: "Générez d’abord la progression pédagogique." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("pedagogical_outline")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", outline.id);
  if (error) return { error: "Enregistrement impossible." };

  await advanceModule(moduleId, "outline_sent");
  revalidatePath(`/modules/${moduleId}`);
  revalidatePath("/dashboard");
  return {};
}

export async function markOutlineValidated(moduleId: string): Promise<OutlineActionState> {
  const outline = await getOutline(moduleId);
  if (!outline || outline.status === "draft") {
    return { error: "La progression pédagogique doit d’abord être envoyée." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("pedagogical_outline")
    .update({ status: "validated", validated_at: new Date().toISOString() })
    .eq("id", outline.id);
  if (error) return { error: "Enregistrement impossible." };

  revalidatePath(`/modules/${moduleId}`);
  return {};
}
