"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { CHECKPOINT_FILES_BUCKET, checkpointResultSchema } from "@/lib/checkpoints/checkpoints";
import { failure, NOT_FOUND, SESSION_EXPIRED } from "@/lib/messages";
import { parseResourceFiles, upsertFile, type ResourceFile } from "@/lib/resources/files";
import { createClient } from "@/lib/supabase/server";

export interface CheckpointActionState {
  error?: string;
  message?: string;
}

const ids = z.object({
  moduleId: z.uuid(),
  checkpointId: z.uuid(),
  studentId: z.uuid(),
});

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Le jalon est bien un jalon de ce module et l'étudiant·e en est membre (la RLS borne déjà au propriétaire). */
async function checkContext(
  supabase: Supabase,
  moduleId: string,
  checkpointId: string,
  studentId: string,
): Promise<boolean> {
  const [{ data: checkpoint }, { data: member }] = await Promise.all([
    supabase
      .from("checkpoint")
      .select("id")
      .eq("id", checkpointId)
      .eq("module_id", moduleId)
      .maybeSingle(),
    supabase
      .from("group_member")
      .select("student_id, student_group!inner(module_id)")
      .eq("student_id", studentId)
      .eq("student_group.module_id", moduleId)
      .limit(1)
      .maybeSingle(),
  ]);
  return Boolean(checkpoint && member);
}

function refresh(moduleId: string, checkpointId: string, studentId: string) {
  revalidatePath(`/modules/${moduleId}/jalons`);
  revalidatePath(`/modules/${moduleId}/jalons/${checkpointId}/${studentId}`);
}

/** Enregistre l'état, le retour écrit et la note privée ; la date de décision suit la validation/le refus. */
export async function saveCheckpointResult(
  moduleId: string,
  checkpointId: string,
  studentId: string,
  input: { status: string; feedback_md: string; private_note: string },
): Promise<CheckpointActionState> {
  const idsParsed = ids.safeParse({ moduleId, checkpointId, studentId });
  const parsed = checkpointResultSchema.safeParse(input);
  if (!idsParsed.success || !parsed.success) {
    return {
      error: "Certains champs ne sont pas valides : vérifie l’état et la longueur des textes.",
    };
  }
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: SESSION_EXPIRED };
  if (!(await checkContext(supabase, moduleId, checkpointId, studentId))) {
    return { error: NOT_FOUND.module };
  }

  const { data: previous } = await supabase
    .from("checkpoint_result")
    .select("status, submitted_at, decided_at")
    .eq("checkpoint_id", checkpointId)
    .eq("student_id", studentId)
    .maybeSingle();

  const { status, feedback_md, private_note } = parsed.data;
  const now = new Date().toISOString();
  const decided = status === "validated" || status === "refused";
  const row = {
    status,
    feedback_md,
    private_note,
    submitted_at: status === "pending" ? null : (previous?.submitted_at ?? now),
    decided_at: decided
      ? previous?.status === status && previous.decided_at
        ? previous.decided_at
        : now
      : null,
  };
  const { error } = await supabase
    .from("checkpoint_result")
    .upsert(
      { checkpoint_id: checkpointId, student_id: studentId, owner_id: auth.user.id, ...row },
      { onConflict: "checkpoint_id,student_id" },
    );
  if (error) return { error: failure("enregistrer", { kept: true }) };
  refresh(moduleId, checkpointId, studentId);
  return { message: "Enregistré." };
}

/**
 * Le fichier part du navigateur vers Supabase Storage ; cette action l'ajoute ensuite à
 * checkpoint_result.files (la ligne est créée au besoin, l'état passe de « à rendre » à « rendu »).
 */
export async function registerCheckpointFile(
  moduleId: string,
  checkpointId: string,
  studentId: string,
  file: ResourceFile,
): Promise<CheckpointActionState> {
  if (!ids.safeParse({ moduleId, checkpointId, studentId }).success) {
    return { error: NOT_FOUND.module };
  }
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: SESSION_EXPIRED };
  const storage = supabase.storage.from(CHECKPOINT_FILES_BUCKET);
  if (!file.path.startsWith(`${auth.user.id}/checkpoints/${checkpointId}/${studentId}/`)) {
    return { error: "Chemin invalide." };
  }
  if (!(await checkContext(supabase, moduleId, checkpointId, studentId))) {
    await storage.remove([file.path]);
    return { error: NOT_FOUND.module };
  }

  const { data: existing } = await supabase
    .from("checkpoint_result")
    .select("files, status, submitted_at")
    .eq("checkpoint_id", checkpointId)
    .eq("student_id", studentId)
    .maybeSingle();

  const { files, replacedPath } = upsertFile(parseResourceFiles(existing?.files), {
    path: file.path,
    name: file.name.slice(0, 255),
    size: file.size,
    mime: file.mime,
  });
  const now = new Date().toISOString();
  const { error } = await supabase.from("checkpoint_result").upsert(
    {
      checkpoint_id: checkpointId,
      student_id: studentId,
      owner_id: auth.user.id,
      files,
      status: !existing || existing.status === "pending" ? "submitted" : existing.status,
      submitted_at: existing?.submitted_at ?? now,
    },
    { onConflict: "checkpoint_id,student_id" },
  );
  if (error) {
    await storage.remove([file.path]);
    return { error: failure("enregistrer") };
  }
  if (replacedPath) await storage.remove([replacedPath]);
  refresh(moduleId, checkpointId, studentId);
  return {};
}

export async function deleteCheckpointFile(
  moduleId: string,
  checkpointId: string,
  studentId: string,
  path: string,
): Promise<CheckpointActionState> {
  if (!ids.safeParse({ moduleId, checkpointId, studentId }).success) {
    return { error: NOT_FOUND.module };
  }
  const supabase = await createClient();
  if (!(await checkContext(supabase, moduleId, checkpointId, studentId))) {
    return { error: NOT_FOUND.module };
  }
  const { data: result } = await supabase
    .from("checkpoint_result")
    .select("id, files")
    .eq("checkpoint_id", checkpointId)
    .eq("student_id", studentId)
    .maybeSingle();
  if (!result) return {};
  const all = parseResourceFiles(result.files);
  if (!all.some((f) => f.path === path)) return {};

  const { error } = await supabase
    .from("checkpoint_result")
    .update({ files: all.filter((f) => f.path !== path) })
    .eq("id", result.id);
  if (error) return { error: failure("retirer le fichier") };
  await supabase.storage.from(CHECKPOINT_FILES_BUCKET).remove([path]);
  refresh(moduleId, checkpointId, studentId);
  return {};
}
