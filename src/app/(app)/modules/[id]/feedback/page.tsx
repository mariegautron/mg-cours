import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import QRCode from "qrcode";

import { FeedbackControls } from "@/components/modules/feedback-controls";
import { Button } from "@/components/ui/button";
import { clientEnv } from "@/lib/env";
import { feedbackUrl, parseAnswers, RATING_MAX, summarize } from "@/lib/feedback/questions";
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
  const summary = summarize((answersRes.data ?? []).map((r) => parseAnswers(r.answers)));
  const card = "bg-card rounded-xl border p-5";

  return (
    <div className="max-w-5xl space-y-5">
      <header className="space-y-1">
        <p className="text-primary text-xs font-bold tracking-widest uppercase">Fin de module</p>
        <h1 className="font-heading text-3xl font-bold tracking-tight">Retour des étudiant·es</h1>
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
          <section aria-labelledby="fl" className={`${card} space-y-3`}>
            <h2 id="fl" className="font-heading text-xl font-bold">
              Donner accès au questionnaire
            </h2>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1">
                <FeedbackControls moduleId={id} url={url} sentAt={link?.sent_at ?? null} />
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
            <h2 id="fr" className="font-heading text-xl font-bold">
              Réponses reçues : {summary.total}
            </h2>
            {summary.total === 0 ? (
              <p className="text-muted-foreground">
                Rien pour l’instant. Les réponses arrivent ici.
              </p>
            ) : (
              <>
                {summary.ratings.map((s) => (
                  <div key={s.section} className="space-y-2">
                    <h3 className="font-semibold">{s.section}</h3>
                    <ul className="divide-y">
                      {s.items.map((i) => (
                        <li
                          key={i.id}
                          className="flex flex-wrap items-center justify-between gap-2 py-2"
                        >
                          <span className="min-w-0 flex-1">{i.label}</span>
                          <span className="text-muted-foreground text-sm">
                            {i.average === null
                              ? "Pas de réponse"
                              : `${String(i.average).replace(".", ",")} / ${RATING_MAX} · ${i.count} rép. · ${i.distribution.join(" / ")}`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                <p className="text-muted-foreground text-xs">
                  Répartition : nombre de réponses pour 1 / 2 / 3 / 4 / 5.
                </p>
                {summary.choices.map((c) => (
                  <div key={c.id} className="space-y-1">
                    <h3 className="font-semibold">{c.label}</h3>
                    <p>{c.options.map((o) => `${o.label} : ${o.count}`).join(" · ")}</p>
                  </div>
                ))}
                {summary.texts
                  .filter((t) => t.entries.length > 0)
                  .map((t) => (
                    <div key={t.id} className="space-y-2">
                      <h3 className="font-semibold">{t.label}</h3>
                      <ul className="space-y-2">
                        {t.entries.map((e, n) => (
                          <li
                            key={n}
                            className="bg-muted/50 rounded-md p-3 text-sm whitespace-pre-wrap"
                          >
                            {e}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
              </>
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
