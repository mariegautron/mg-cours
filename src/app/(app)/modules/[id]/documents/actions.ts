"use server";

import { revalidatePath } from "next/cache";

import { DOCUMENT_KINDS, type DocumentKind } from "@/lib/modules/documents";
import { createClient } from "@/lib/supabase/server";

/**
 * Le fichier part directement du navigateur vers Supabase Storage (les fonctions serveur
 * plafonnent les requêtes à quelques Mo). Cette action enregistre ensuite le document.
 */
export async function registerModuleDocument(
  moduleId: string,
  kind: DocumentKind,
  file: { path: string; name: string; size: number; mime: string },
): Promise<{ error?: string }> {
  if (!DOCUMENT_KINDS.includes(kind)) return { error: "Type de document invalide." };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Session expirée." };
  if (!file.path.startsWith(`${auth.user.id}/${moduleId}/`)) return { error: "Chemin invalide." };

  const { error } = await supabase.from("module_document").insert({
    module_id: moduleId,
    kind,
    name: file.name.slice(0, 255),
    path: file.path,
    size_bytes: file.size,
    mime: file.mime,
  });
  if (error) {
    await supabase.storage.from("module-documents").remove([file.path]);
    return { error: "Enregistrement impossible. Réessayez." };
  }

  revalidatePath(`/modules/${moduleId}`);
  return {};
}

export async function deleteModuleDocument(moduleId: string, docId: string) {
  "use server";
  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("module_document")
    .select("path")
    .eq("id", docId)
    .eq("module_id", moduleId)
    .maybeSingle();
  if (!doc) return;
  await supabase.storage.from("module-documents").remove([doc.path]);
  await supabase.from("module_document").delete().eq("id", docId);
  revalidatePath(`/modules/${moduleId}`);
}
