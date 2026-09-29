"use server";

import { renderToBuffer } from "@react-pdf/renderer";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";

import { resultsEmailSubject, resultsEmailText } from "@/lib/assessments/results-email";
import { loadResultSheets } from "@/lib/assessments/results-data";
import { serverEnv } from "@/lib/env";
import { ResultsDocument } from "@/lib/pdf/results";
import { createClient } from "@/lib/supabase/server";

/** Mémorise la date d'envoi (rappel « déjà envoyés le … » avant un nouvel envoi). */
async function recordSent(moduleId: string, assessmentId: string) {
  const supabase = await createClient();
  await supabase
    .from("assessment")
    .update({ results_sent_at: new Date().toISOString() })
    .eq("id", assessmentId);
  revalidatePath(`/modules/${moduleId}/assessments/${assessmentId}`);
}

export interface EmailState {
  error?: string;
  sent?: number;
  skipped?: string[];
}

/** Envoie à chaque étudiant·e sa fiche de résultat en PDF (celles sans e-mail sont listées). */
export async function sendResultsEmail(
  moduleId: string,
  assessmentId: string,
): Promise<EmailState> {
  const { RESEND_API_KEY, RESEND_FROM } = serverEnv();
  if (!RESEND_API_KEY || !RESEND_FROM) {
    return {
      error: "L’envoi d’e-mails n’est pas configuré (RESEND_API_KEY et RESEND_FROM manquent).",
    };
  }

  const sheets = await loadResultSheets(moduleId, assessmentId);
  if (!sheets || sheets.length === 0)
    return { error: "Aucune note n’est saisie : il n’y a rien à envoyer." };

  const resend = new Resend(RESEND_API_KEY);
  let sent = 0;
  const skipped: string[] = [];

  for (const sheet of sheets) {
    const withEmail = sheet.recipients.filter((r) => !!r.email);
    for (const r of sheet.recipients) if (!r.email) skipped.push(r.name);
    if (withEmail.length === 0) continue;

    const pdf = Buffer.from(await renderToBuffer(ResultsDocument({ sheets: [sheet] })));
    // Un message par personne : dans un groupe, les adresses des autres membres ne sont jamais visibles.
    for (const r of withEmail) {
      const { error } = await resend.emails.send({
        from: RESEND_FROM,
        to: [r.email as string],
        subject: resultsEmailSubject(sheet),
        text: resultsEmailText(sheet, r.firstName),
        attachments: [{ filename: "resultats.pdf", content: pdf }],
      });
      if (error) {
        if (sent > 0) await recordSent(moduleId, assessmentId);
        return {
          error: `L’envoi à ${r.name} a échoué (${error.message}). ${sent} e-mail${sent > 1 ? "s" : ""} déjà parti${sent > 1 ? "s" : ""} : ne relance pas tout l’envoi sans vérifier.`,
          sent,
          skipped,
        };
      }
      sent += 1;
    }
  }

  if (sent > 0) await recordSent(moduleId, assessmentId);
  return { sent, skipped };
}
