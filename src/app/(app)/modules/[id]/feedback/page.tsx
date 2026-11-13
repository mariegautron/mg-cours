import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import QRCode from "qrcode";

import {
  AGILE_FEEDBACK_MODULE_ID,
  FeedbackAnalysisAgile,
} from "@/components/modules/feedback-analysis-agile";
import { FeedbackResults } from "@/components/modules/feedback-results";
import { FeedbackControls } from "@/components/modules/feedback-controls";
import { Button } from "@/components/ui/button";
import { OpenInWindowButton } from "@/components/present/open-in-window-button";
import { clientEnv } from "@/lib/env";
import { feedbackUrl, parseAnswers, summarize } from "@/lib/feedback/questions";
import { getModule } from "@/lib/modules/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Retour des étudiant·es" };

/** Retour des étudiant·es (fin de module) : lien et QR du questionnaire anonyme, puis synthèse des réponses. */
export default async function FeedbackPage({ params }: PageProps<"/modules/[id]/feedback">) {
  const { id } = await params;
  const mod = await getModule(id);
  if (!mod) notFound();

  const supabase = await createClient();
  const [linkRes, answersRes] = await Promise.all([
    supabase
      .from("module_feedback_link")
      .select("token, sent_at")
      .eq("module_id", id)
      .is("revoked_at", null)
      .maybeSingle(),
    supabase
      .from("module_feedback")
      .select("answers, created_at")
      .eq("module_id", id)
      .order("created_at", { ascending: false }),
  ]);
  const unavailable = Boolean(linkRes.error || answersRes.error);
  const link = linkRes.data;
  const url = link ? feedbackUrl(clientEnv.NEXT_PUBLIC_APP_URL, link.token) : null;
  const qr = url
    ? await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" })
    : null;
  // Double clic sur « Envoyer » : deux réponses identiques (avec du texte) à moins d'une minute = une seule.
  const rows = answersRes.data ?? [];
  const unique = rows.filter((r, i) => {
    const next = rows[i + 1];
    if (!next || JSON.stringify(r.answers) !== JSON.stringify(next.answers)) return true;
    const hasText = Object.keys(parseAnswers(r.answers).texts).length > 0;
    const gap = Math.abs(new Date(r.created_at).getTime() - new Date(next.created_at).getTime());
    return !(hasText && gap < 60_000);
  });
  const summary = summarize(unique.map((r) => parseAnswers(r.answers)));
  const card = "bg-card rounded-xl border p-5";

  return (
    <div className="max-w-5xl space-y-5">
      <header className="space-y-1">
        <p className="text-muted-foreground text-[0.8125rem] font-medium">Fin de module</p>
        <h1>Retour des étudiant·es</h1>
        <p className="text-muted-foreground">
          Un questionnaire anonyme pour savoir ce qui a marché et ce qu’il faut changer pour la
          prochaine promo. Les réponses n’ont aucun lien avec une personne.
        </p>
      </header>

      {unavailable ? (
        <p className={`${card} text-muted-foreground`}>
          Cette page sera disponible après la mise à jour de la base de données.
        </p>
      ) : (
        <>
          {id === AGILE_FEEDBACK_MODULE_ID && summary.total > 0 ? <FeedbackAnalysisAgile /> : null}

          <section aria-labelledby="fl" className={`${card} space-y-3`}>
            <h2 id="fl" className="text-sm font-semibold">
              Donner accès au questionnaire
            </h2>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1 space-y-2">
                <FeedbackControls moduleId={id} url={url} sentAt={link?.sent_at ?? null} />
                {url ? (
                  <OpenInWindowButton href={`/present/modules/${id}/feedback`} variant="outline">
                    Projeter le QR code
                  </OpenInWindowButton>
                ) : null}
              </div>
              {qr ? (
                <div
                  role="img"
                  aria-label="QR code vers le questionnaire"
                  className="size-40 shrink-0 rounded-md bg-white p-1 [&>svg]:size-full"
                  dangerouslySetInnerHTML={{ __html: qr }}
                />
              ) : null}
            </div>
          </section>

          <section aria-labelledby="fr" className={`${card} space-y-4`}>
            <h2 id="fr" className="text-sm font-semibold">
              Réponses reçues : {summary.total}
            </h2>
            {summary.total === 0 ? (
              <p className="text-muted-foreground">
                Rien pour l’instant. Les réponses arrivent ici.
              </p>
            ) : (
              <FeedbackResults summary={summary} hasAnalysis={id === AGILE_FEEDBACK_MODULE_ID} />
            )}
          </section>
        </>
      )}

      <Button asChild variant="ghost" size="touch">
        <Link href={`/modules/${id}/finish`}>← Terminer le module</Link>
      </Button>
    </div>
  );
}
