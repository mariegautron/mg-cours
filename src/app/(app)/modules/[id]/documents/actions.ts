"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export interface DocumentActionState {
  error?: string;
  saved?: boolean;
}

const KINDS = ["school_expectations", "outline_sent"] as const;
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.oasis.opendocument.text",
]);

function safeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .slice(-120);
}

export async function uploadModuleDocument(
  moduleId: string,
  kind: (typeof KINDS)[number],
  _prev: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  if (!KINDS.includes(kind)) return { error: "Type de document invalide." };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choisissez un fichier." };
  if (file.size > MAX_BYTES) return { error: "Fichier trop volumineux (10 Mo maximum)." };
  if (!ALLOWED_MIME.has(file.type))
    return { error: "Formats acceptés : PDF, Word ou OpenDocument." };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Session expirée." };

  const path = `${auth.user.id}/${moduleId}/${crypto.randomUUID()}-${safeName(file.name)}`;
  const { error: uploadError } = await supabase.storage
    .from("module-documents")
    .upload(path, file, { contentType: file.type });
  if (uploadError) return { error: "Dépôt impossible. Réessayez." };

  const { error } = await supabase.from("module_document").insert({
    module_id: moduleId,
    kind,
    name: file.name,
    path,
    size_bytes: file.size,
    mime: file.type,
  });
  if (error) {
    await supabase.storage.from("module-documents").remove([path]);
    return { error: "Enregistrement impossible. Réessayez." };
  }

  revalidatePath(`/modules/${moduleId}`);
  return { saved: true };
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
