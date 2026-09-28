"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  parseResourceFiles,
  RESOURCE_FILES_BUCKET,
  upsertFile,
  type ResourceFile,
} from "@/lib/resources/files";
import { readResourceForm } from "@/lib/resources/schema";
import { createClient } from "@/lib/supabase/server";

export interface ResourceFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

function flatten(fieldErrors: Record<string, string[] | undefined>): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(fieldErrors).filter(([, v]) => v && v.length) as [string, string[]][],
  );
}

export async function createResource(
  _prev: ResourceFormState,
  formData: FormData,
): Promise<ResourceFormState> {
  const parsed = readResourceForm(formData);
  if (!parsed.success) {
    return { fieldErrors: flatten(parsed.error.flatten().fieldErrors) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("resource")
    .insert({
      title: parsed.data.title,
      description: parsed.data.description || null,
      content: parsed.data.content || null,
      url: parsed.data.url || null,
      kind: parsed.data.kind,
      audience: parsed.data.audience,
      category: parsed.data.category || null,
      tags: parsed.data.tags,
      status: parsed.data.status,
      intent_note: parsed.data.intentNote?.trim() || null,
    })
    .select("id")
    .single();

  if (error) return { error: "Enregistrement impossible. Réessayez." };

  revalidatePath("/resources");
  redirect(`/resources/${data.id}`);
}

export async function updateResource(
  id: string,
  _prev: ResourceFormState,
  formData: FormData,
): Promise<ResourceFormState> {
  const parsed = readResourceForm(formData);
  if (!parsed.success) {
    return { fieldErrors: flatten(parsed.error.flatten().fieldErrors) };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("resource")
    .update({
      title: parsed.data.title,
      description: parsed.data.description || null,
      content: parsed.data.content || null,
      url: parsed.data.url || null,
      kind: parsed.data.kind,
      audience: parsed.data.audience,
      category: parsed.data.category || null,
      tags: parsed.data.tags,
      status: parsed.data.status,
      intent_note: parsed.data.intentNote?.trim() || null,
    })
    .eq("id", id);

  if (error) return { error: "Enregistrement impossible. Réessayez." };

  revalidatePath("/resources");
  revalidatePath(`/resources/${id}`);
  redirect(`/resources/${id}`);
}

/** Création rapide d'une ressource « à construire » : un titre et une note d'intention. */
export async function createDraftResource(formData: FormData): Promise<void> {
  const title = String(formData.get("title") ?? "").trim();
  if (!title || title.length > 200) return;
  const intentNote = String(formData.get("intentNote") ?? "")
    .trim()
    .slice(0, 2000);

  const supabase = await createClient();
  const { error } = await supabase.from("resource").insert({
    title,
    status: "progress",
    intent_note: intentNote || null,
  });
  if (error) return;
  revalidatePath("/resources");
}

async function setArchived(id: string, archived: boolean) {
  const supabase = await createClient();
  await supabase
    .from("resource")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", id);
  revalidatePath("/resources");
  revalidatePath(`/resources/${id}`);
}

export async function archiveResource(id: string) {
  "use server";
  await setArchived(id, true);
}

export async function unarchiveResource(id: string) {
  "use server";
  await setArchived(id, false);
}

export async function deleteResource(id: string) {
  "use server";
  const supabase = await createClient();
  const { data: current } = await supabase
    .from("resource")
    .select("files")
    .eq("id", id)
    .maybeSingle();
  const paths = parseResourceFiles(current?.files).map((f) => f.path);
  const { error } = await supabase.from("resource").delete().eq("id", id);
  if (error) return;
  if (paths.length) await supabase.storage.from(RESOURCE_FILES_BUCKET).remove(paths);
  revalidatePath("/resources");
  redirect("/resources");
}

/**
 * Le fichier part directement du navigateur vers Supabase Storage (les fonctions serveur
 * plafonnent les requêtes à quelques Mo). Cette action l'ajoute ensuite à resource.files.
 */
export async function registerResourceFile(
  resourceId: string,
  file: ResourceFile,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Session expirée." };
  if (!file.path.startsWith(`${auth.user.id}/${resourceId}/`)) return { error: "Chemin invalide." };

  const storage = supabase.storage.from(RESOURCE_FILES_BUCKET);
  const { data: resource } = await supabase
    .from("resource")
    .select("files")
    .eq("id", resourceId)
    .maybeSingle();
  if (!resource) {
    await storage.remove([file.path]);
    return { error: "Ressource introuvable." };
  }

  const { files, replacedPath } = upsertFile(parseResourceFiles(resource.files), {
    path: file.path,
    name: file.name.slice(0, 255),
    size: file.size,
    mime: file.mime,
  });
  const { error } = await supabase.from("resource").update({ files: files }).eq("id", resourceId);
  if (error) {
    await storage.remove([file.path]);
    return { error: "Enregistrement impossible. Réessayez." };
  }
  if (replacedPath) await storage.remove([replacedPath]);

  revalidatePath(`/resources/${resourceId}`);
  return {};
}

export async function deleteResourceFile(resourceId: string, path: string) {
  "use server";
  const supabase = await createClient();
  const { data: resource } = await supabase
    .from("resource")
    .select("files")
    .eq("id", resourceId)
    .maybeSingle();
  if (!resource) return;
  const files = parseResourceFiles(resource.files);
  if (!files.some((f) => f.path === path)) return;

  const { error } = await supabase
    .from("resource")
    .update({ files: files.filter((f) => f.path !== path) })
    .eq("id", resourceId);
  if (error) return;
  await supabase.storage.from(RESOURCE_FILES_BUCKET).remove([path]);
  revalidatePath(`/resources/${resourceId}`);
}

/** Restaure une ancienne version (l'état courant est sauvegardé par le déclencheur avant écrasement). */
export async function restoreResourceVersion(resourceId: string, versionId: string) {
  "use server";
  const supabase = await createClient();
  const { data: version } = await supabase
    .from("resource_version")
    .select("title, description, content, url, category, tags")
    .eq("id", versionId)
    .eq("resource_id", resourceId)
    .maybeSingle();
  if (!version) return;

  const { error } = await supabase.from("resource").update(version).eq("id", resourceId);
  if (error) return;

  revalidatePath("/resources");
  revalidatePath(`/resources/${resourceId}`);
  redirect(`/resources/${resourceId}`);
}
