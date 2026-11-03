"use server";

import { revalidatePath } from "next/cache";

import { Resend } from "resend";

import { clientEnv, serverEnv } from "@/lib/env";
import { feedbackEmail, feedbackUrl } from "@/lib/feedback/questions";
import { EMAIL_NOT_ENABLED, failure, NOT_FOUND } from "@/lib/messages";
import { notebookStudents } from "@/lib/notebook/notebook";
import { getTeacherName } from "@/lib/outline/queries";
import { generateToken, hashToken } from "@/lib/quiz/token";
import { createClient } from "@/lib/supabase/server";
import { listModuleGroups } from "@/lib/students/queries";

export interface FeedbackActionState {
  error?: string;
  message?: string;
}

/** Crée (ou remplace) le lien du questionnaire : l'ancien lien cesse de fonctionner, les réponses restent. */
export async function createFeedbackLink(moduleId: string): Promise<FeedbackActionState> {
  const supabase = await createClient();
  const revoke = await supabase
    .from("module_feedback_link")
    .update({ revoked_at: new Date().toISOString() })
    .eq("module_id", moduleId)
    .is("revoked_at", null);
  if (revoke.error) return { error: failure("créer le lien") };
  const token = generateToken();
  const { error } = await supabase
    .from("module_feedback_link")
    .insert({ module_id: moduleId, token, token_hash: hashToken(token) });
  if (error) return { error: failure("créer le lien") };
  revalidatePath(`/modules/${moduleId}/feedback`);
  return { message: "Lien créé." };
}

/** Arrête le questionnaire : le lien ne marche plus, les réponses déjà reçues restent consultables. */
export async function revokeFeedbackLink(moduleId: string): Promise<FeedbackActionState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("module_feedback_link")
    .update({ revoked_at: new Date().toISOString() })
    .eq("module_id", moduleId)
    .is("revoked_at", null);
  if (error) return { error: failure("arrêter le questionnaire") };
  revalidatePath(`/modules/${moduleId}/feedback`);
  return { message: "Questionnaire arrêté." };
}

/** Envoie le lien du questionnaire à tous les étudiant·es du module qui ont une adresse e-mail. */
export async function sendFeedbackEmails(moduleId: string): Promise<FeedbackActionState> {
  const { RESEND_API_KEY, RESEND_FROM } = serverEnv();
  if (!RESEND_API_KEY || !RESEND_FROM) {
    console.error("[e-mail] envoi désactivé : RESEND_API_KEY ou RESEND_FROM manquant");
    return { error: EMAIL_NOT_ENABLED };
  }
  const supabase = await createClient();
  const [{ data: mod }, { data: link }, groups, teacherName] = await Promise.all([
    supabase.from("module").select("name").eq("id", moduleId).maybeSingle(),
    supabase
      .from("module_feedback_link")
      .select("id, token")
      .eq("module_id", moduleId)
      .is("revoked_at", null)
      .maybeSingle(),
    listModuleGroups(moduleId),
    getTeacherName(),
  ]);
  if (!mod) return { error: NOT_FOUND.module };
  if (!link) return { error: "Crée d’abord le lien du questionnaire." };

  const students = notebookStudents(groups);
  const withMail = students.filter((s) => s.email?.trim());
  if (withMail.length === 0) return { error: "Aucun·e étudiant·e n’a d’adresse e-mail." };

  const url = feedbackUrl(clientEnv.NEXT_PUBLIC_APP_URL, link.token);
  const resend = new Resend(RESEND_API_KEY);
  let sent = 0;
  const failed: string[] = [];
  for (const s of withMail) {
    const mail = feedbackEmail({
      firstName: s.first_name,
      moduleName: mod.name,
      url,
      teacherName,
    });
    try {
      const { error } = await resend.emails.send({
        from: RESEND_FROM,
        to: [s.email!.trim()],
        subject: mail.subject,
        text: mail.text,
      });
      if (error) throw new Error(error.message);
      sent += 1;
    } catch (error) {
      console.error(`[e-mail] échec de l’envoi du questionnaire à ${s.first_name}`, error);
      failed.push(`${s.first_name} ${s.last_name}`);
    }
  }
  if (sent > 0) {
    await supabase
      .from("module_feedback_link")
      .update({ sent_at: new Date().toISOString() })
      .eq("id", link.id);
  }
  revalidatePath(`/modules/${moduleId}/feedback`);
  const missing = students.length - withMail.length;
  const parts = [`Envoyé à ${sent} étudiant·e${sent > 1 ? "s" : ""}.`];
  if (missing > 0) parts.push(`${missing} sans adresse e-mail.`);
  if (failed.length > 0) return { error: `${parts.join(" ")} Échec pour : ${failed.join(", ")}.` };
  return { message: parts.join(" ") };
}
