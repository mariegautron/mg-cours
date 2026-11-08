"use server";

import { randomUUID } from "node:crypto";

import { ASSESSMENT_FILES_BUCKET } from "@/lib/assessments/files";
import { lateMinutes, storageName, validateDeposit, type DepositInput } from "@/lib/deposits/rules";
import { loadDepositContext, type DepositContext } from "@/lib/deposits/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface DepositItem {
  id: string;
  kind: "file" | "link";
  label: string;
  fileName: string | null;
  sizeBytes: number | null;
  url: string | null;
}

export interface DepositState {
  error?: string;
  /** Rendu en place (vide si rien n'a été déposé). */
  items: DepositItem[];
  /** Dépôt actuel : heure serveur (ISO), retard en minutes, qui l'a déposé. */
  submittedAt: string | null;
  lateMinutes: number;
  byName: string | null;
  /** Le dépôt actuel vient d'un·e autre membre du groupe : demander confirmation avant de remplacer. */
  byOther: boolean;
  /** Date limite (ISO) ou null. */
  deadline: string | null;
  group: string | null;
}

const empty = (error?: string): DepositState => ({
  error,
  items: [],
  submittedAt: null,
  lateMinutes: 0,
  byName: null,
  byOther: false,
  deadline: null,
  group: null,
});

const ownerFilter = (ctx: DepositContext) =>
  ctx.owner.kind === "student"
    ? { col: "student_id", id: ctx.owner.id }
    : { col: "group_id", id: ctx.owner.id };

async function readState(ctx: DepositContext): Promise<DepositState> {
  const admin = createAdminClient();
  const f = ownerFilter(ctx);
  const { data } = await admin
    .from("submission_item")
    .select("*")
    .eq("assessment_id", ctx.assessmentId)
    .eq(f.col, f.id)
    .eq("added_by", "student")
    .order("created_at");
  const rows = (data ?? []) as unknown as {
    id: string;
    kind: string;
    label: string;
    file_name: string | null;
    size_bytes: number | null;
    url: string | null;
    submitted_at: string;
    submitted_by_student_id: string | null;
  }[];
  const first = rows[0];
  let byName: string | null = null;
  if (first?.submitted_by_student_id) {
    const { data: s } = await admin
      .from("student")
      .select("first_name")
      .eq("id", first.submitted_by_student_id)
      .maybeSingle();
    byName = s?.first_name ?? null;
  }
  return {
    items: rows.map((r) => ({
      id: r.id,
      kind: r.kind === "link" ? "link" : "file",
      label: r.label,
      fileName: r.file_name,
      sizeBytes: r.size_bytes,
      url: r.url,
    })),
    submittedAt: first?.submitted_at ?? null,
    lateMinutes: first ? lateMinutes(ctx.deadline, new Date(first.submitted_at)) : 0,
    byName,
    byOther: !!first && first.submitted_by_student_id !== ctx.studentId,
    deadline: ctx.deadline?.toISOString() ?? null,
    group: ctx.owner.kind === "group" ? ctx.owner.name : null,
  };
}

/** Rendu actuel de la personne (ou de son groupe) pour une évaluation. */
export async function getDeposit(token: string, assessmentId: string): Promise<DepositState> {
  const res = await loadDepositContext(token, assessmentId);
  if (!res.ok) return empty(res.error);
  return readState(res.ctx);
}

/** Réserve un lot et renvoie une adresse d'envoi signée (courte durée) par fichier. */
export async function prepareUploads(
  token: string,
  assessmentId: string,
  files: DepositInput["files"],
  link: string | null,
): Promise<{ error?: string; batchId?: string; uploads?: { path: string; token: string }[] }> {
  const res = await loadDepositContext(token, assessmentId);
  if (!res.ok) return { error: res.error };
  const { ctx } = res;
  const check = validateDeposit({ files, link }, ctx.accepts);
  if (!check.ok) return { error: check.error };
  const batchId = randomUUID();
  const admin = createAdminClient();
  const uploads: { path: string; token: string }[] = [];
  for (const [i, f] of files.entries()) {
    const path = `${ctx.ownerId}/${assessmentId}/submissions/${batchId}/${i}-${storageName(f.name)}`;
    const { data, error } = await admin.storage
      .from(ASSESSMENT_FILES_BUCKET)
      .createSignedUploadUrl(path);
    if (error || !data) return { error: "L’envoi n’a pas pu démarrer. Réessaie dans un instant." };
    uploads.push({ path, token: data.token });
  }
  return { batchId, uploads };
}

/**
 * Valide le dépôt : les fichiers annoncés doivent être arrivés dans le stockage. L'heure est celle du
 * serveur. Le rendu précédent de la même personne (ou du groupe) est remplacé ; les éléments ajoutés
 * à la main par Marie ne sont jamais touchés.
 */
export async function commitDeposit(
  token: string,
  assessmentId: string,
  batchId: string,
  files: DepositInput["files"],
  link: string | null,
): Promise<DepositState> {
  const res = await loadDepositContext(token, assessmentId);
  if (!res.ok) return empty(res.error);
  const { ctx } = res;
  const check = validateDeposit({ files, link }, ctx.accepts);
  if (!check.ok) return { ...(await readState(ctx)), error: check.error };
  if (!/^[0-9a-f-]{36}$/i.test(batchId))
    return { ...(await readState(ctx)), error: "Dépôt invalide." };

  const admin = createAdminClient();
  const folder = `${ctx.ownerId}/${assessmentId}/submissions/${batchId}`;
  if (files.length > 0) {
    const { data: present } = await admin.storage.from(ASSESSMENT_FILES_BUCKET).list(folder);
    if ((present ?? []).length < files.length) {
      return {
        ...(await readState(ctx)),
        error: "Certains fichiers ne sont pas arrivés. Rien n’est déposé : réessaie.",
      };
    }
  }
  const f = ownerFilter(ctx);
  const { data: old } = await admin
    .from("submission_item")
    .select("id, storage_path")
    .eq("assessment_id", assessmentId)
    .eq(f.col, f.id)
    .eq("added_by", "student");
  const now = new Date().toISOString();
  const rows = [
    ...files.map((file, i) => ({
      assessment_id: assessmentId,
      owner_id: ctx.ownerId,
      student_id: ctx.owner.kind === "student" ? ctx.owner.id : null,
      group_id: ctx.owner.kind === "group" ? ctx.owner.id : null,
      kind: "file" as const,
      storage_path: `${folder}/${i}-${storageName(file.name)}`,
      file_name: file.name.slice(0, 255),
      mime: file.mime || "application/octet-stream",
      size_bytes: file.size,
      label: "",
      added_by: "student" as const,
      submitted_at: now,
      submitted_by_student_id: ctx.studentId,
      batch_id: batchId,
    })),
    ...(check.link
      ? [
          {
            assessment_id: assessmentId,
            owner_id: ctx.ownerId,
            student_id: ctx.owner.kind === "student" ? ctx.owner.id : null,
            group_id: ctx.owner.kind === "group" ? ctx.owner.id : null,
            kind: "link" as const,
            url: check.link,
            label: "",
            added_by: "student" as const,
            submitted_at: now,
            submitted_by_student_id: ctx.studentId,
            batch_id: batchId,
          },
        ]
      : []),
  ];
  const { error } = await admin.from("submission_item").insert(rows as never);
  if (error) {
    await admin.storage
      .from(ASSESSMENT_FILES_BUCKET)
      .remove(files.map((file, i) => `${folder}/${i}-${storageName(file.name)}`));
    return { ...(await readState(ctx)), error: "Le dépôt n’a pas pu être enregistré. Réessaie." };
  }
  // L'ancien rendu n'est retiré qu'une fois le nouveau enregistré.
  if (old?.length) {
    await admin
      .from("submission_item")
      .delete()
      .in(
        "id",
        old.map((o) => o.id),
      );
    const paths = old.map((o) => o.storage_path).filter((p): p is string => !!p);
    if (paths.length) await admin.storage.from(ASSESSMENT_FILES_BUCKET).remove(paths);
  }
  return readState(ctx);
}
