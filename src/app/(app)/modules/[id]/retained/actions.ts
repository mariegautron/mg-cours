"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { failure, SESSION_EXPIRED } from "@/lib/messages";

export interface RetainState {
  error?: string;
  /** Message de confirmation, annoncé à l'écran. */
  done?: string;
}

/** Retient une ressource pour un module ; déjà retenue = sans effet. */
export async function retainResource(moduleId: string, resourceId: string): Promise<RetainState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: SESSION_EXPIRED };

  // Module et ressource doivent appartenir à l'utilisatrice connectée (la RLS ne renvoie rien sinon).
  const [{ data: mod }, { data: resource }] = await Promise.all([
    supabase.from("module").select("id, name").eq("id", moduleId).maybeSingle(),
    supabase.from("resource").select("id").eq("id", resourceId).maybeSingle(),
  ]);
  if (!mod || !resource) return { error: "Ce module ou cette ressource n’existe plus." };

  const { error } = await supabase
    .from("module_resource")
    .upsert(
      { module_id: moduleId, resource_id: resourceId },
      { onConflict: "module_id,resource_id", ignoreDuplicates: true },
    );
  if (error) return { error: failure("enregistrer") };

  revalidatePath(`/modules/${moduleId}`);
  revalidatePath("/resources");
  revalidatePath(`/resources/${resourceId}`);
  return { done: `Ressource retenue pour « ${mod.name} ».` };
}

export async function unretainResource(moduleId: string, resourceId: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("module_resource")
    .delete()
    .eq("module_id", moduleId)
    .eq("resource_id", resourceId);
  revalidatePath(`/modules/${moduleId}`);
  revalidatePath(`/resources/${resourceId}`);
}

/** « Ajouter au module… » depuis /resources et la fiche ressource. */
export async function addResourceToModule(
  resourceId: string,
  _prev: RetainState,
  formData: FormData,
): Promise<RetainState> {
  const moduleId = String(formData.get("moduleId") ?? "");
  if (!moduleId) return { error: "Choisis un module." };
  return retainResource(moduleId, resourceId);
}
