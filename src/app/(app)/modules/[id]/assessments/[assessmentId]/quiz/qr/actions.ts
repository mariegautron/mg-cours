"use server";

import { revalidatePath } from "next/cache";

import { failure } from "@/lib/messages";
import { canRelease } from "@/lib/quiz/class-access";
import { getQuizByAssessment } from "@/lib/quiz/queries";
import { generateToken, hashToken } from "@/lib/quiz/token";
import { createClient } from "@/lib/supabase/server";

const qrPath = (moduleId: string, assessmentId: string) =>
  `/modules/${moduleId}/assessments/${assessmentId}/quiz/qr`;

export interface ClassLinkState {
  error?: string;
}

/** Crée le lien de classe (ou le remplace : l'ancien QR cesse de fonctionner). */
export async function createClassLink(
  moduleId: string,
  assessmentId: string,
): Promise<ClassLinkState> {
  const quiz = await getQuizByAssessment(assessmentId);
  if (!quiz) return { error: "Ce QCM n’existe plus." };
  const supabase = await createClient();
  const revoke = await supabase
    .from("quiz_class_link")
    .update({ revoked_at: new Date().toISOString() })
    .eq("quiz_id", quiz.id)
    .is("revoked_at", null);
  if (revoke.error) return { error: failure("créer le QR code") };
  const token = generateToken();
  const { error } = await supabase
    .from("quiz_class_link")
    .insert({ quiz_id: quiz.id, token, token_hash: hashToken(token) });
  if (error) return { error: failure("créer le QR code") };
  revalidatePath(qrPath(moduleId, assessmentId));
  return {};
}

export async function revokeClassLink(
  moduleId: string,
  assessmentId: string,
): Promise<ClassLinkState> {
  const quiz = await getQuizByAssessment(assessmentId);
  if (!quiz) return { error: "Ce QCM n’existe plus." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("quiz_class_link")
    .update({ revoked_at: new Date().toISOString() })
    .eq("quiz_id", quiz.id)
    .is("revoked_at", null);
  if (error) return { error: failure("arrêter le QR code") };
  revalidatePath(qrPath(moduleId, assessmentId));
  return {};
}

/** Libère un nom pris par erreur : la copie reprend un jeton neuf (l'ancien lien meurt). Avant le début seulement. */
export async function releaseName(
  moduleId: string,
  assessmentId: string,
  attemptId: string,
): Promise<ClassLinkState> {
  const supabase = await createClient();
  const { data: attempt } = await supabase
    .from("quiz_attempt")
    .select("id, status")
    .eq("id", attemptId)
    .maybeSingle();
  if (!attempt) return { error: "Cette copie n’existe plus." };
  if (!canRelease(attempt.status)) {
    return {
      error: "Cette copie est déjà commencée : un nom ne se libère plus. Utilise « Nouveau lien ».",
    };
  }
  const { error: tokenError } = await supabase
    .from("quiz_attempt")
    .update({ token_hash: hashToken(generateToken()), sent_at: null, used_at: null })
    .eq("id", attemptId);
  if (tokenError) return { error: failure("libérer ce nom") };
  const { error } = await supabase.from("quiz_claim").delete().eq("attempt_id", attemptId);
  if (error) return { error: failure("libérer ce nom") };
  revalidatePath(qrPath(moduleId, assessmentId));
  return {};
}
