"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  parseResourceFiles,
  RESOURCE_FILES_BUCKET,
  upsertFile,
  type ResourceFile,
} from "@/lib/resources/files";
import { isResourceKind, TEACHER_KINDS, type ResourceKind } from "@/lib/resources/kind";
import { readResourceForm } from "@/lib/resources/schema";
import { listActiveModules } from "@/lib/modules/queries";
import { createClient } from "@/lib/supabase/server";
import { failure, NOT_FOUND, SESSION_EXPIRED } from "@/lib/messages";

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

  if (error) return { error: failure("enregistrer", { kept: true }) };

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

  if (error) return { error: failure("enregistrer", { kept: true }) };

  revalidatePath("/resources");
  revalidatePath(`/resources/${id}`);
  redirect(`/resources/${id}`);
}

export interface AutosaveResult {
  id?: string;
  savedAt?: string;
}

/**
 * Enregistrement automatique côté serveur (maquette « BibCreer ») : dès que le titre et le type sont
 * connus, la ressource existe, « à construire » ; ensuite chaque pause d'écriture la met à jour.
 * Rien n'est enregistré tant que la saisie est incomplète (pas d'erreur affichée : la personne n'a
 * pas demandé d'enregistrer). Le statut d'une ressource existante n'est jamais modifié ici : c'est
 * « Marquer comme prête » qui le change.
 */
export async function autosaveResource(
  id: string | null,
  formData: FormData,
): Promise<AutosaveResult> {
  const parsed = readResourceForm(formData);
  if (!parsed.success) return {};
  const d = parsed.data;
  const fields = {
    title: d.title,
    description: d.description || null,
    content: d.content || null,
    url: d.url || null,
    kind: d.kind,
    audience: d.audience,
    category: d.category || null,
    tags: d.tags,
    intent_note: d.intentNote?.trim() || null,
  };
  const supabase = await createClient();
  const savedAt = new Date().toISOString();
  if (id) {
    const { error } = await supabase.from("resource").update(fields).eq("id", id);
    return error ? {} : { id, savedAt };
  }
  const { data, error } = await supabase
    .from("resource")
    .insert({ ...fields, status: "progress" })
    .select("id")
    .single();
  if (error || !data) return {};
  revalidatePath("/resources");
  return { id: data.id, savedAt };
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

export interface InlineResourceResult {
  error?: string;
  resource?: {
    id: string;
    title: string;
    kind: ResourceKind;
    audience: "students" | "teacher";
    status: "ready" | "progress";
    category: string | null;
  };
}

/**
 * Création d'une ressource depuis le formulaire de séance (US-62) : titre et type suffisent, elle
 * est créée « à construire » (jamais projetée) et se complète ensuite dans Ressources.
 */
export async function createResourceInline(input: {
  title: string;
  kind: string;
}): Promise<InlineResourceResult> {
  const title = input.title.trim();
  if (!title || title.length > 200)
    return { error: "Le titre est obligatoire (200 caractères max)." };
  if (!isResourceKind(input.kind)) return { error: "Choisis un type." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("resource")
    .insert({
      title,
      kind: input.kind,
      status: "progress",
      audience: TEACHER_KINDS.includes(input.kind) ? "teacher" : "students",
    })
    .select("id, title, kind, audience, status, category")
    .single();
  if (error || !data || !data.kind) return { error: failure("créer la ressource") };

  revalidatePath("/resources");
  return { resource: { ...data, kind: data.kind } };
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
  if (!auth.user) return { error: SESSION_EXPIRED };
  if (!file.path.startsWith(`${auth.user.id}/${resourceId}/`)) return { error: "Chemin invalide." };

  const storage = supabase.storage.from(RESOURCE_FILES_BUCKET);
  const { data: resource } = await supabase
    .from("resource")
    .select("files")
    .eq("id", resourceId)
    .maybeSingle();
  if (!resource) {
    await storage.remove([file.path]);
    return { error: NOT_FOUND.resource };
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
    return { error: failure("enregistrer") };
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

/** Modules proposés par « Ajouter au module… » : lus à l'ouverture, pas recopiés dans chaque ligne de la liste. */
export async function listModuleChoices(): Promise<{ id: string; name: string; year: number }[]> {
  const modules = await listActiveModules();
  return modules.map((m) => ({ id: m.id, name: m.name, year: m.year }));
}

/** « Partir d'une ressource existante » : ce qu'on recopie (jamais ses fichiers ni son historique). */
export interface ResourceSeed {
  title: string;
  kind: string | null;
  category: string | null;
  audience: string;
  description: string | null;
  tags: string[];
  content: string;
}

export async function getResourceSeed(id: string): Promise<ResourceSeed | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("resource")
    .select("title, kind, category, audience, description, tags, content")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return {
    title: data.title,
    kind: data.kind,
    category: data.category,
    audience: data.audience,
    description: data.description,
    tags: data.tags ?? [],
    content: data.content ?? "",
  };
}

/** Ressources proposées pour « Partir d'une ressource existante » (les plus récentes). */
export async function listSeedChoices(): Promise<{ id: string; title: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("resource")
    .select("id, title")
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(100);
  return data ?? [];
}
