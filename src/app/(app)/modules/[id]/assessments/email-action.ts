"use server";

import { renderToBuffer } from "@react-pdf/renderer";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";

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
    return { error: "Envoi d’e-mails non configuré (RESEND_API_KEY / RESEND_FROM)." };
  }

  const sheets = await loadResultSheets(moduleId, assessmentId);
  if (!sheets || sheets.length === 0) return { error: "Aucune note saisie à envoyer." };

  const resend = new Resend(RESEND_API_KEY);
  let sent = 0;
  const skipped: string[] = [];

  for (const sheet of sheets) {
    const to = sheet.recipients.map((r) => r.email).filter((e): e is string => !!e);
    for (const r of sheet.recipients) if (!r.email) skipped.push(r.name);
    if (to.length === 0) continue;

    const pdf = await renderToBuffer(ResultsDocument({ sheets: [sheet] }));
    const { error } = await resend.emails.send({
      from: RESEND_FROM,
      to,
      subject: `Vos résultats — ${sheet.title}`,
      text: `Bonjour,\n\nVous trouverez en pièce jointe votre résultat pour « ${sheet.title} » (${sheet.moduleName}).\n\nBien cordialement.`,
      attachments: [{ filename: "resultats.pdf", content: Buffer.from(pdf) }],
    });
    if (error) {
      if (sent > 0) await recordSent(moduleId, assessmentId);
      return { error: "Échec de l’envoi d’un e-mail.", sent, skipped };
    }
    sent += to.length;
  }

  if (sent > 0) await recordSent(moduleId, assessmentId);
  return { sent, skipped };
}
