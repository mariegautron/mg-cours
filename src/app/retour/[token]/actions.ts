"use server";

import { redirect } from "next/navigation";

import { answersFromForm, isEmptyAnswers } from "@/lib/feedback/questions";
import { submitFeedback } from "@/lib/feedback/public";

/** Envoi d'une réponse anonyme : rien n'est relisible ensuite, on redirige vers le remerciement. */
export async function sendFeedback(token: string, formData: FormData): Promise<void> {
  const answers = answersFromForm(formData);
  if (isEmptyAnswers(answers)) redirect(`/retour/${token}?problem=empty`);
  const status = await submitFeedback(token, answers);
  if (status === "ok") redirect(`/retour/${token}?merci=1`);
  redirect(`/retour/${token}?problem=${status}`);
}
