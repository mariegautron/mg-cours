"use server";

import { revalidatePath } from "next/cache";

import { buildCurrentOutline, getOutline } from "@/lib/outline/queries";
import { advanceModule } from "@/lib/modules/advance";
import { createClient } from "@/lib/supabase/server";
import { failure, NOT_FOUND } from "@/lib/messages";

export interface OutlineActionState {
  error?: string;
  /** Jalon franchi (progression envoyée) : l'interface le célèbre. */
  done?: boolean;
}

/** Génère (ou rafraîchit) l'instantané de la trame. Ne touche pas au statut d'envoi. */
export async function generateOutline(moduleId: string): Promise<OutlineActionState> {
  const content = await buildCurrentOutline(moduleId);
  if (!content) return { error: NOT_FOUND.module };
  if (content.sessions.length === 0) {
    return { error: "Ajoute au moins une séance au module avant de générer la progression." };
  }

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
  if (error) return { error: failure("générer la progression") };

  await advanceModule(moduleId, "outline_generated");
  revalidatePath(`/modules/${moduleId}`);
  return {};
}

export async function markOutlineSent(moduleId: string): Promise<OutlineActionState> {
  const outline = await getOutline(moduleId);
  if (!outline) return { error: "Génère d’abord la progression pédagogique." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("pedagogical_outline")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", outline.id);
  if (error) return { error: failure("enregistrer") };

  await advanceModule(moduleId, "outline_sent");
  revalidatePath(`/modules/${moduleId}`);
  revalidatePath("/dashboard");
  return { done: true };
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
  if (error) return { error: failure("enregistrer") };

  revalidatePath(`/modules/${moduleId}`);
  return {};
}
