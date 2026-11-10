import type { Metadata } from "next";

import { sendFeedback } from "@/app/retour/[token]/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MarkAnswered, RespondentField } from "@/components/feedback/respondent-field";
import { INVALID_LINK_TEXT, INVALID_LINK_TITLE } from "@/lib/student-messages";
import { callFeedbackForm } from "@/lib/feedback/public";
import {
  CHOICE_QUESTIONS,
  MAX_TEXT,
  RATING_LABELS,
  RATING_MAX,
  RATING_MIN,
  RATING_SECTIONS,
  TEXT_QUESTIONS,
} from "@/lib/feedback/questions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Ton avis sur le module",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const PROBLEMS: Record<string, string> = {
  empty: "Réponds à au moins une question avant d’envoyer.",
  invalid: "Ce lien n’est plus valable.",
  unavailable:
    "L’envoi n’a pas fonctionné. Réessaie dans un instant : tes réponses sont conservées.",
};

function Message({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h1 className="font-heading text-3xl font-bold tracking-tight">{title}</h1>
      {children ? <p className="text-muted-foreground">{children}</p> : null}
    </section>
  );
}

/** Questionnaire de retour, anonyme, ouvert par le lien de classe d'un module. */
export default async function FeedbackPage({ params, searchParams }: PageProps<"/retour/[token]">) {
  const { token } = await params;
  const { problem, merci, maj } = await searchParams;
  // Clé du questionnaire côté navigateur (un fragment du lien, jamais renvoyé au serveur).
  const linkKey = token.slice(0, 12);
  const res = await callFeedbackForm(token);
  const problemText = typeof problem === "string" ? (PROBLEMS[problem] ?? null) : null;
  const ratingValues = Array.from(
    { length: RATING_MAX - RATING_MIN + 1 },
    (_, i) => RATING_MIN + i,
  );

  return (
    <main id="main" className="mx-auto w-full max-w-2xl flex-1 space-y-8 p-4 sm:p-6">
      {res.status === "ok" && merci ? (
        <>
          <MarkAnswered linkKey={linkKey} />
          <Message title="Merci !">
            {maj === "1"
              ? "Tu avais déjà répondu : tes réponses sont mises à jour (elles ne comptent qu’une fois)."
              : `Ta réponse est bien enregistrée. Elle servira à améliorer « ${res.moduleName} » pour la suite.`}
          </Message>
        </>
      ) : res.status === "ok" ? (
        <>
          <header className="space-y-2">
            <p className="text-muted-foreground text-sm font-semibold">{res.moduleName}</p>
            <h1 className="font-heading text-3xl font-bold tracking-tight">
              Ton avis sur le module
            </h1>
            <p className="font-semibold">
              Ce questionnaire est anonyme : ton nom n’est jamais enregistré.
            </p>
            <p className="text-muted-foreground">
              Le questionnaire est anonyme et n’a aucun lien avec ta note. Il prend environ 5
              minutes. Réponds à ce que tu veux : un exemple précis m’aide plus qu’un avis général.
            </p>
          </header>
          {problemText ? (
            <p
              role="alert"
              className="border-destructive text-destructive rounded-md border p-3 text-sm"
            >
              {problemText}
            </p>
          ) : null}
          <form action={sendFeedback.bind(null, token)} className="space-y-10">
            <RespondentField linkKey={linkKey} />
            {RATING_SECTIONS.map((section) => (
              <section key={section.id} aria-labelledby={`s-${section.id}`} className="space-y-4">
                <h2 id={`s-${section.id}`} className="font-heading text-xl font-bold">
                  {section.title}
                </h2>
                <p className="text-muted-foreground text-sm">
                  De 1 (« {RATING_LABELS[0]} ») à 5 (« {RATING_LABELS[RATING_MAX - 1]} »).
                </p>
                {section.questions.map((q) => (
                  <fieldset key={q.id} className="space-y-2">
                    <legend className="font-medium">{q.label}</legend>
                    <div className="flex flex-wrap gap-2">
                      {ratingValues.map((v) => (
                        <label
                          key={v}
                          className="has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:focus-visible]:ring-ring flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md border px-3 text-sm font-semibold has-[:focus-visible]:ring-2"
                        >
                          <input
                            type="radio"
                            name={`rating_${q.id}`}
                            value={v}
                            className="sr-only"
                            aria-label={`${v} sur ${RATING_MAX}, ${RATING_LABELS[v - 1]}`}
                          />
                          {v}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}
              </section>
            ))}

            <section aria-labelledby="s-choices" className="space-y-4">
              <h2 id="s-choices" className="font-heading text-xl font-bold">
                Deux choix à faire
              </h2>
              {CHOICE_QUESTIONS.map((q) => (
                <fieldset key={q.id} className="space-y-2">
                  <legend className="font-medium">{q.label}</legend>
                  <div className="flex flex-wrap gap-x-5 gap-y-1">
                    {q.options.map((o) => (
                      <label key={o.id} className="flex min-h-11 items-center gap-2">
                        <input
                          type="radio"
                          name={`choice_${q.id}`}
                          value={o.id}
                          className="size-4"
                        />
                        {o.label}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </section>

            <section aria-labelledby="s-texts" className="space-y-4">
              <h2 id="s-texts" className="font-heading text-xl font-bold">
                Raconte-nous
              </h2>
              <p className="text-muted-foreground text-sm">
                Pense à un moment précis plutôt qu’à une impression générale : c’est ce qui m’aide
                le plus. Quelques mots suffisent, tout est facultatif.
              </p>
              {TEXT_QUESTIONS.map((q) => (
                <div key={q.id} className="space-y-1">
                  <label htmlFor={`text_${q.id}`} className="font-medium">
                    {q.label}
                  </label>
                  <Textarea
                    id={`text_${q.id}`}
                    name={`text_${q.id}`}
                    rows={3}
                    maxLength={MAX_TEXT}
                    placeholder={q.starter}
                  />
                </div>
              ))}
            </section>

            <Button type="submit" size="touch">
              Envoyer mes réponses
            </Button>
          </form>
        </>
      ) : res.status === "invalid" ? (
        <Message title={INVALID_LINK_TITLE}>{INVALID_LINK_TEXT}</Message>
      ) : res.status === "throttled" ? (
        <Message title="Trop d’essais">Patiente quelques minutes, puis réessaie.</Message>
      ) : (
        <Message title="Indisponible pour le moment">Réessaie dans un instant.</Message>
      )}
    </main>
  );
}
