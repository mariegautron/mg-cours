"use server";

import { revalidatePath } from "next/cache";

import { ASSESSMENT_FILES_BUCKET } from "@/lib/assessments/files";
import { failure, NOT_FOUND, SESSION_EXPIRED } from "@/lib/messages";
import { LABEL_MAX_LENGTH, validateFile, validateLink } from "@/lib/projects/submission-items";
import { createClient } from "@/lib/supabase/server";

export interface SubmissionItemState {
  error?: string;
  ok?: boolean;
}

export type SubmissionOwner = { kind: "student" | "group"; id: string };

const ownerColumns = (o: SubmissionOwner) =>
  o.kind === "student"
    ? { student_id: o.id, group_id: null }
    : { student_id: null, group_id: o.id };

const refresh = (moduleId: string, assessmentId: string) =>
  revalidatePath(`/modules/${moduleId}/assessments/${assessmentId}`);

async function assessmentExists(moduleId: string, assessmentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("assessment")
    .select("id")
    .eq("id", assessmentId)
    .eq("module_id", moduleId)
    .maybeSingle();
  return !!data;
}

/** Ajoute un lien au rendu d'une personne ou d'un groupe (par Marie). */
export async function addSubmissionLink(
  moduleId: string,
  assessmentId: string,
  owner: SubmissionOwner,
  url: string,
  label: string,
): Promise<SubmissionItemState> {
  const link = validateLink(url);
  if (!link.ok) return { error: link.error };
  if (!(await assessmentExists(moduleId, assessmentId))) return { error: NOT_FOUND.assessment };
  const supabase = await createClient();
  const { error } = await supabase.from("submission_item").insert({
    assessment_id: assessmentId,
    ...ownerColumns(owner),
    kind: "link",
    url: link.url,
    label: label.trim().slice(0, LABEL_MAX_LENGTH),
    added_by: "teacher",
  });
  if (error) return { error: failure("ajouter le lien", { kept: true }) };
  refresh(moduleId, assessmentId);
  return { ok: true };
}

/** Enregistre un fichier déjà déposé dans le stockage privé (le navigateur l'y envoie directement). */
export async function registerSubmissionFile(
  moduleId: string,
  assessmentId: string,
  owner: SubmissionOwner,
  file: { path: string; name: string; size: number; mime: string },
  label: string,
): Promise<SubmissionItemState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: SESSION_EXPIRED };
  if (!file.path.startsWith(`${auth.user.id}/${assessmentId}/submissions/`)) {
    return { error: "Chemin invalide." };
  }
  const check = validateFile(file);
  if (!check.ok) {
    await supabase.storage.from(ASSESSMENT_FILES_BUCKET).remove([file.path]);
    return { error: check.error };
  }
  if (!(await assessmentExists(moduleId, assessmentId))) {
    await supabase.storage.from(ASSESSMENT_FILES_BUCKET).remove([file.path]);
    return { error: NOT_FOUND.assessment };
  }
  const { error } = await supabase.from("submission_item").insert({
    assessment_id: assessmentId,
    ...ownerColumns(owner),
    kind: "file",
    storage_path: file.path,
    file_name: file.name.slice(0, 255),
    mime: file.mime,
    size_bytes: file.size,
    label: label.trim().slice(0, LABEL_MAX_LENGTH),
    added_by: "teacher",
  });
  if (error) {
    await supabase.storage.from(ASSESSMENT_FILES_BUCKET).remove([file.path]);
    return { error: failure("enregistrer le fichier") };
  }
  refresh(moduleId, assessmentId);
  return { ok: true };
}

export async function deleteSubmissionItem(
  moduleId: string,
  assessmentId: string,
  itemId: string,
): Promise<SubmissionItemState> {
  const supabase = await createClient();
  const { data: item } = await supabase
    .from("submission_item")
    .select("id, storage_path")
    .eq("id", itemId)
    .eq("assessment_id", assessmentId)
    .maybeSingle();
  if (!item) return { error: "Cet élément n’existe plus." };
  const { error } = await supabase.from("submission_item").delete().eq("id", itemId);
  if (error) return { error: failure("supprimer") };
  if (item.storage_path)
    await supabase.storage.from(ASSESSMENT_FILES_BUCKET).remove([item.storage_path]);
  refresh(moduleId, assessmentId);
  return { ok: true };
}
