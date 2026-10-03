"use server";

import { revalidatePath } from "next/cache";

import { loadResultSheets } from "@/lib/assessments/results-data";
import { clientEnv } from "@/lib/env";
import { failure, NOT_FOUND } from "@/lib/messages";
import { generateToken, hashToken } from "@/lib/quiz/token";
import { publicSheetFor, resultUrl, type LinkLine } from "@/lib/result-links/sheet";
import { createClient } from "@/lib/supabase/server";

export interface PublishState {
  error?: string;
  /** Liens créés pendant cet appel : les jetons ne sont jamais relisibles ensuite (seul le haché est gardé). */
  created?: (LinkLine & { studentId: string })[];
  refreshed?: number;
}

const UNAVAILABLE =
  "La publication par lien sera disponible après la mise à jour de la base de données. L’envoi par e-mail reste possible.";

async function tableAvailable() {
  const supabase = await createClient();
  const { error } = await supabase.from("result_link").select("id").limit(1);
  return !error;
}

function refresh(moduleId: string, assessmentId: string) {
  revalidatePath(`/modules/${moduleId}/assessments/${assessmentId}`);
}

/**
 * Publie les résultats : un lien personnel par étudiant·e, avec l'instantané de SES résultats
 * seulement. Les personnes déjà publiées gardent leur lien (leur instantané est mis à jour).
 */
export async function publishResults(
  moduleId: string,
  assessmentId: string,
): Promise<PublishState> {
  if (!(await tableAvailable())) return { error: UNAVAILABLE };
  const sheets = await loadResultSheets(moduleId, assessmentId);
  if (!sheets || sheets.length === 0) return { error: "Aucune note à publier pour l’instant." };

  const supabase = await createClient();
  const { data: active } = await supabase
    .from("result_link")
    .select("id, student_id")
    .eq("assessment_id", assessmentId)
    .is("revoked_at", null);
  const activeByStudent = new Map((active ?? []).map((l) => [l.student_id, l.id]));

  const created: NonNullable<PublishState["created"]> = [];
  let refreshed = 0;
  const done = new Set<string>();
  for (const sheet of sheets) {
    for (const r of sheet.recipients) {
      if (!r.id || done.has(r.id)) continue;
      done.add(r.id);
      const payload = publicSheetFor(sheet, r.id);
      if (!payload) continue;
      const existing = activeByStudent.get(r.id);
      if (existing) {
        const { error } = await supabase
          .from("result_link")
          .update({ payload: payload as never })
          .eq("id", existing);
        if (error) return { error: failure("publier les résultats") };
        refreshed += 1;
        continue;
      }
      const token = generateToken();
      const { error } = await supabase.from("result_link").insert({
        assessment_id: assessmentId,
        student_id: r.id,
        token_hash: hashToken(token),
        payload: payload as never,
      });
      if (error) return { error: failure("publier les résultats") };
      created.push({
        studentId: r.id,
        name: r.name,
        url: resultUrl(clientEnv.NEXT_PUBLIC_APP_URL, token),
      });
    }
  }
  refresh(moduleId, assessmentId);
  return { created, refreshed };
}

/** Nouveau lien pour une personne : l'ancien est révoqué (il affichera « Lien invalide »). */
export async function regenerateResultLink(
  moduleId: string,
  assessmentId: string,
  studentId: string,
): Promise<PublishState> {
  if (!(await tableAvailable())) return { error: UNAVAILABLE };
  const sheets = await loadResultSheets(moduleId, assessmentId);
  const sheet = sheets?.find((s) => s.recipients.some((r) => r.id === studentId));
  const payload = sheet ? publicSheetFor(sheet, studentId) : null;
  const recipient = sheet?.recipients.find((r) => r.id === studentId);
  if (!payload || !recipient) return { error: NOT_FOUND.student };

  const supabase = await createClient();
  const { error: revokeError } = await supabase
    .from("result_link")
    .update({ revoked_at: new Date().toISOString() })
    .eq("assessment_id", assessmentId)
    .eq("student_id", studentId)
    .is("revoked_at", null);
  if (revokeError) return { error: failure("régénérer le lien") };
  const token = generateToken();
  const { error } = await supabase.from("result_link").insert({
    assessment_id: assessmentId,
    student_id: studentId,
    token_hash: hashToken(token),
    payload: payload as never,
  });
  if (error) return { error: failure("régénérer le lien") };
  refresh(moduleId, assessmentId);
  return {
    created: [
      { studentId, name: recipient.name, url: resultUrl(clientEnv.NEXT_PUBLIC_APP_URL, token) },
    ],
  };
}

/** Révoque le lien d'une personne : il n'affichera plus rien. */
export async function revokeResultLink(
  moduleId: string,
  assessmentId: string,
  studentId: string,
): Promise<PublishState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("result_link")
    .update({ revoked_at: new Date().toISOString() })
    .eq("assessment_id", assessmentId)
    .eq("student_id", studentId)
    .is("revoked_at", null);
  if (error) return { error: failure("révoquer le lien") };
  refresh(moduleId, assessmentId);
  return {};
}
