import {
  highlights,
  RATING_MAX,
  type FeedbackSummary,
  type RatingSummary,
} from "@/lib/feedback/questions";

const SHADES = ["bg-primary/20", "bg-primary/35", "bg-primary/55", "bg-primary/75", "bg-primary"];

const fr = (n: number) => String(n).replace(".", ",");

/** Répartition des notes en une barre empilée ; le détail chiffré reste lisible en texte. */
function RatingBar({ item }: { item: RatingSummary }) {
  const detail = item.distribution.map((n, i) => `${n} × ${i + 1}`).join(", ");
  return (
    <li className="space-y-1.5 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="min-w-0 flex-1">{item.label}</span>
        <span className="font-semibold tabular-nums">
          {item.average === null ? "Pas de réponse" : `${fr(item.average)} / ${RATING_MAX}`}
        </span>
      </div>
      {item.count > 0 ? (
        <>
          <div
            role="img"
            aria-label={`Répartition : ${detail}`}
            className="flex h-3 overflow-hidden rounded-full"
          >
            {item.distribution.map((n, i) =>
              n > 0 ? (
                <div
                  key={i}
                  className={SHADES[i]}
                  style={{ width: `${(n / item.count) * 100}%` }}
                />
              ) : null,
            )}
          </div>
          <p className="text-muted-foreground text-xs">
            {item.count} réponse{item.count > 1 ? "s" : ""} · {detail}
          </p>
        </>
      ) : null}
    </li>
  );
}

/** Synthèse des réponses : points forts / à améliorer, barres, choix, puis les mots des étudiant·es. */
export function FeedbackResults({
  summary,
  hasAnalysis = false,
}: {
  summary: FeedbackSummary;
  /** Une « Analyse des réponses » rédigée est affichée au-dessus : pas de second résumé. */
  hasAnalysis?: boolean;
}) {
  const h = highlights(summary);
  const panel = "rounded-lg border p-4 space-y-2";
  return (
    <div className="space-y-8">
      {!hasAnalysis && h.strengths.length + h.improvements.length > 0 ? (
        <section aria-labelledby="fh" className="space-y-3">
          <h3 id="fh" className="font-heading text-lg font-bold">
            En bref
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className={`${panel} border-primary/40 bg-primary/5`}>
              <h4 className="font-semibold">Ce qui marche</h4>
              {h.strengths.length > 0 ? (
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {h.strengths.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">Rien de net dans les chiffres.</p>
              )}
            </div>
            <div className={`${panel} bg-muted/40`}>
              <h4 className="font-semibold">À améliorer</h4>
              {h.improvements.length > 0 ? (
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {h.improvements.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">Rien d’alarmant dans les chiffres.</p>
              )}
            </div>
          </div>
          <p className="text-muted-foreground text-xs">
            Lu dans les notes et les choix seulement. Les détails sont dans les réponses écrites,
            plus bas.
          </p>
        </section>
      ) : null}

      {/* Réponses détaillées repliées : le résumé tient en un écran à 125 %. */}
      <details className="rounded-lg border">
        <summary className="focus-visible:ring-ring flex min-h-11 cursor-pointer items-center rounded-lg px-4 py-2 font-semibold focus-visible:ring-2 focus-visible:outline-none">
          Réponses détaillées (notes, choix, mots)
        </summary>
        <div className="space-y-8 px-4 pb-4">
          <section aria-labelledby="fn" className="space-y-1">
            <h3 id="fn" className="font-heading text-lg font-bold">
              Les notes
            </h3>
            {summary.ratings.map((s) => (
              <ul key={s.section} className="divide-y">
                {s.items.map((i) => (
                  <RatingBar key={i.id} item={i} />
                ))}
              </ul>
            ))}
            <p className="text-muted-foreground text-xs">
              Barre : de 1 (clair) à 5 (foncé). Les chiffres donnent le nombre de réponses pour
              chaque note.
            </p>
          </section>

          <section aria-labelledby="fc" className="space-y-4">
            <h3 id="fc" className="font-heading text-lg font-bold">
              Les choix
            </h3>
            {summary.choices.map((c) => {
              const total = c.options.reduce((n, o) => n + o.count, 0);
              return (
                <div key={c.id} className="space-y-2">
                  <h4 className="font-semibold">{c.label}</h4>
                  <ul className="space-y-2">
                    {c.options.map((o) => {
                      const share = total ? Math.round((o.count / total) * 100) : 0;
                      return (
                        <li key={o.id} className="space-y-1">
                          <div className="flex justify-between gap-2 text-sm">
                            <span>{o.label}</span>
                            <span className="tabular-nums">
                              {o.count} · {share} %
                            </span>
                          </div>
                          <div className="bg-muted h-2.5 overflow-hidden rounded-full" aria-hidden>
                            <div className="bg-primary h-full" style={{ width: `${share}%` }} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </section>

          <section aria-labelledby="ft" className="space-y-3">
            <h3 id="ft" className="font-heading text-lg font-bold">
              Leurs mots
            </h3>
            {summary.texts.map((t) => (
              <details key={t.id} className="rounded-lg border">
                <summary className="focus-visible:ring-ring flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-lg px-4 py-2 font-semibold focus-visible:ring-2 focus-visible:outline-none">
                  <span>{t.label}</span>
                  <span className="text-muted-foreground text-sm font-normal">
                    {t.entries.length} réponse{t.entries.length > 1 ? "s" : ""}
                  </span>
                </summary>
                {t.entries.length > 0 ? (
                  <ul className="space-y-3 px-4 pt-1 pb-4">
                    {t.entries.map((e, n) => (
                      <li key={n}>
                        <blockquote className="border-primary/50 border-l-4 pl-3 text-sm whitespace-pre-wrap">
                          {e}
                        </blockquote>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground px-4 pb-4 text-sm">Pas de réponse écrite.</p>
                )}
              </details>
            ))}
          </section>
        </div>
      </details>
    </div>
  );
}
