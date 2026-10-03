"use server";

import { revalidatePath } from "next/cache";

import { DOCUMENT_KINDS, type DocumentKind } from "@/lib/modules/documents";
import { advanceModule } from "@/lib/modules/advance";
import { createClient } from "@/lib/supabase/server";
import { failure, SESSION_EXPIRED } from "@/lib/messages";

/**
 * Le fichier part directement du navigateur vers Supabase Storage (les fonctions serveur
 * plafonnent les requêtes à quelques Mo). Cette action enregistre ensuite le document.
 */
export async function registerModuleDocument(
  moduleId: string,
  kind: DocumentKind,
  file: { path: string; name: string; size: number; mime: string },
  meta: { label?: string; signedOn?: string } = {},
): Promise<{ error?: string }> {
  if (!DOCUMENT_KINDS.includes(kind)) return { error: "Type de document invalide." };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: SESSION_EXPIRED };
  if (!file.path.startsWith(`${auth.user.id}/${moduleId}/`)) return { error: "Chemin invalide." };

  const agreement =
    kind === "training_agreement"
      ? {
          label: meta.label?.trim().slice(0, 120) || null,
          signed_on: /^\d{4}-\d{2}-\d{2}$/.test(meta.signedOn ?? "") ? meta.signedOn : null,
        }
      : {};
  const { error } = await supabase.from("module_document").insert({
    module_id: moduleId,
    kind,
    name: file.name.slice(0, 255),
    path: file.path,
    size_bytes: file.size,
    mime: file.mime,
    ...agreement,
  });
  if (error) {
    await supabase.storage.from("module-documents").remove([file.path]);
    return {
      error:
        kind === "training_agreement"
          ? "La convention de formation sera disponible après la mise à jour de la base de données."
          : failure("enregistrer"),
    };
  }

  if (kind === "outline_sent") {
    // La progression déposée vaut progression envoyée (module repris, envoi hors application).
    await advanceModule(moduleId, "outline_sent");
    revalidatePath(`/modules/${moduleId}/billing`);
    revalidatePath("/billing");
    revalidatePath("/dashboard");
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
  await supabase.from("module_document").delete().eq("id", docId);
  // Le fichier n'est effacé que si aucun autre module (rattachement) ne le référence encore.
  const { count } = await supabase
    .from("module_document")
    .select("id", { count: "exact", head: true })
    .eq("path", doc.path);
  if (!count) await supabase.storage.from("module-documents").remove([doc.path]);
  revalidatePath(`/modules/${moduleId}`);
}

/** Libellé libre et date de signature d'une convention (tous deux facultatifs). */
export async function updateAgreementMeta(
  moduleId: string,
  docId: string,
  label: string,
  signedOn: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("module_document")
    .update({
      label: label.trim().slice(0, 120) || null,
      signed_on: /^\d{4}-\d{2}-\d{2}$/.test(signedOn) ? signedOn : null,
    })
    .eq("id", docId)
    .eq("module_id", moduleId)
    .eq("kind", "training_agreement");
  if (error) return { error: failure("enregistrer") };
  revalidatePath(`/modules/${moduleId}`);
  return {};
}

/** Modules auxquels rattacher un document (tous sauf celui-ci, rangés compris), avec leur année scolaire. */
export async function listAttachTargets(
  moduleId: string,
): Promise<{ id: string; name: string; year: number }[]> {
  const { listModules } = await import("@/lib/modules/queries");
  const all = await listModules({ includeArchived: true });
  return all
    .filter((m) => m.id !== moduleId)
    .map((m) => ({ id: m.id, name: m.name, year: m.year }));
}

/**
 * « Rattacher aussi à un autre module » : une ligne de plus pour l'autre module, qui pointe vers le
 * même fichier de stockage (pas de copie). Le libellé et la date se règlent module par module.
 */
export async function attachDocumentToModule(
  moduleId: string,
  docId: string,
  targetModuleId: string,
): Promise<{ error?: string; attached?: string }> {
  if (moduleId === targetModuleId) return { error: "Choisis un autre module." };
  const supabase = await createClient();
  const [{ data: doc }, { data: target }] = await Promise.all([
    supabase
      .from("module_document")
      .select("*")
      .eq("id", docId)
      .eq("module_id", moduleId)
      .maybeSingle(),
    supabase.from("module").select("id, name").eq("id", targetModuleId).maybeSingle(),
  ]);
  if (!doc || !target) return { error: failure("rattacher le document") };
  const { data: already } = await supabase
    .from("module_document")
    .select("id")
    .eq("module_id", targetModuleId)
    .eq("path", doc.path)
    .maybeSingle();
  if (already) return { error: `Ce document est déjà rattaché à « ${target.name} ».` };
  const { error } = await supabase.from("module_document").insert({
    module_id: targetModuleId,
    kind: doc.kind,
    name: doc.name,
    path: doc.path,
    size_bytes: doc.size_bytes,
    mime: doc.mime,
    label: doc.label,
    signed_on: doc.signed_on,
  });
  if (error) return { error: failure("rattacher le document") };
  revalidatePath(`/modules/${targetModuleId}`);
  return { attached: target.name };
}
