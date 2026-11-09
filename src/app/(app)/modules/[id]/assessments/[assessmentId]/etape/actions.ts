"use server";

import { revalidatePath } from "next/cache";

import { isProgressReview, isReviewMark } from "@/lib/assessments/progress-review";
import { saveVersionedField, type SaveFieldResult } from "@/lib/assessments/versioned-save";
import { createClient } from "@/lib/supabase/server";
import type { Json, Tables } from "@/types/db";

type Review = Tables<"progress_review">;
type Supabase = Awaited<ReturnType<typeof createClient>>;

const obj = (v: Json | undefined): Record<string, Json> =>
  typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, Json>) : {};
const str = (v: Json | undefined) => (typeof v === "string" ? v : "");

/** Champs vus par les étudiant·es : les modifier repasse un retour terminé « en cours ». */
const PUBLIC_FIELDS = new Set(["mark", "comment", "global", "person"]);

function readField(row: Review, field: string): string {
  const name = field.split(":")[0];
  const key = field.split(":").slice(1).join(":");
  if (name === "mark") return str(obj(row.marks)[key]);
  if (name === "comment") return str(obj(row.comments)[key]);
  if (name === "global") return row.global_comment;
  if (name === "person") return str(obj(row.person_comments)[key]);
  if (name === "private") return row.private_note;
  return "";
}

function patchFor(row: Review, field: string, value: string): Partial<Review> | { error: string } {
  const name = field.split(":")[0];
  const key = field.split(":").slice(1).join(":");
  const withKey = (current: Json, v: string): Json => {
    const next = { ...obj(current) };
    if (v === "") delete next[key];
    else next[key] = v;
    return next;
  };
  const reopen: Partial<Review> =
    PUBLIC_FIELDS.has(name) && row.state === "done" ? { state: "in_progress" } : {};
  if (name === "mark") {
    if (value !== "" && !isReviewMark(value)) return { error: "Repère inconnu." };
    return { marks: withKey(row.marks, value), ...reopen };
  }
  if (name === "comment")
    return { comments: withKey(row.comments, value.slice(0, 5000)), ...reopen };
  if (name === "global") return { global_comment: value.slice(0, 10000), ...reopen };
  if (name === "person")
    return { person_comments: withKey(row.person_comments, value.slice(0, 5000)), ...reopen };
  if (name === "private") return { private_note: value.slice(0, 20000) };
  return { error: "Champ inconnu." };
}

/** Vérifie que l'évaluation est un point d'étape du module. */
async function checkReview(supabase: Supabase, moduleId: string, assessmentId: string) {
  const { data } = await supabase
    .from("assessment")
    .select("id, module_id, type")
    .eq("id", assessmentId)
    .maybeSingle();
  return !!data && data.module_id === moduleId && isProgressReview(data);
}

async function ensureReview(
  supabase: Supabase,
  assessmentId: string,
  subjectId: string,
): Promise<Review | null> {
  const { data: existing } = await supabase
    .from("progress_review")
    .select("*")
    .eq("assessment_id", assessmentId)
    .eq("subject_id", subjectId)
    .maybeSingle();
  if (existing) return existing;
  await supabase
    .from("progress_review")
    .upsert(
      { assessment_id: assessmentId, subject_id: subjectId },
      { onConflict: "assessment_id,subject_id", ignoreDuplicates: true },
    );
  const { data } = await supabase
    .from("progress_review")
    .select("*")
    .eq("assessment_id", assessmentId)
    .eq("subject_id", subjectId)
    .maybeSingle();
  return data;
}

/** Enregistre UN champ du retour avec sa version (jamais d'écrasement d'une saisie plus récente). */
export async function saveReviewField(
  moduleId: string,
  assessmentId: string,
  subjectId: string,
  field: string,
  value: string,
  baseVersion: number,
  force = false,
): Promise<SaveFieldResult> {
  const supabase = await createClient();
  if (!(await checkReview(supabase, moduleId, assessmentId)))
    return { ok: false, error: "Ce point d’étape n’existe plus." };
  return saveVersionedField<Review>({
    supabase,
    table: "progress_review",
    load: () => ensureReview(supabase, assessmentId, subjectId),
    field,
    value,
    baseVersion,
    force,
    readField,
    patchFor: (row, f, v) => patchFor(row, f, v),
  });
}

/** « Terminer le retour » (jamais bloquant) ; `false` : le rouvrir. */
export async function finishReview(
  moduleId: string,
  assessmentId: string,
  subjectId: string,
  done: boolean,
): Promise<{ error?: string; doneAt?: string | null }> {
  const supabase = await createClient();
  if (!(await checkReview(supabase, moduleId, assessmentId)))
    return { error: "Ce point d’étape n’existe plus." };
  const row = await ensureReview(supabase, assessmentId, subjectId);
  if (!row) return { error: "Le retour n’a pas pu être enregistré. Réessaie." };
  const doneAt = done ? new Date().toISOString() : null;
  const { error } = await supabase
    .from("progress_review")
    .update({ state: done ? "done" : "in_progress", done_at: doneAt })
    .eq("id", row.id);
  if (error) return { error: "Le retour n’a pas pu être enregistré. Réessaie." };
  revalidatePath(`/modules/${moduleId}/assessments/${assessmentId}`);
  revalidatePath(`/modules/${moduleId}/assessments`);
  return { doneAt };
}

/**
 * Publie les retours terminés : les étudiant·es voient cette version dans leur espace. Un retour
 * repassé « en cours » garde sa dernière version publiée jusqu'à la prochaine publication.
 */
export async function publishReviews(
  moduleId: string,
  assessmentId: string,
): Promise<{ error?: string; published?: number }> {
  const supabase = await createClient();
  if (!(await checkReview(supabase, moduleId, assessmentId)))
    return { error: "Ce point d’étape n’existe plus." };
  const { data: rows } = await supabase
    .from("progress_review")
    .select("*")
    .eq("assessment_id", assessmentId)
    .eq("state", "done");
  const now = new Date().toISOString();
  let published = 0;
  for (const r of rows ?? []) {
    const { error } = await supabase
      .from("progress_review")
      .update({
        published: {
          marks: r.marks,
          comments: r.comments,
          global_comment: r.global_comment,
          person_comments: r.person_comments,
        },
        published_at: now,
      })
      .eq("id", r.id);
    if (!error) published += 1;
  }
  revalidatePath(`/modules/${moduleId}/assessments/${assessmentId}`);
  return { published };
}
