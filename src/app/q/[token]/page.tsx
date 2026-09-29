import type { Metadata } from "next";

import { QuizRunner } from "@/components/quiz/quiz-runner";
import { QuizStart } from "@/components/quiz/quiz-start";
import { QuizResults, type SubmittedState } from "@/components/quiz/quiz-results";
import { Markdown } from "@/components/markdown";
import { callQuiz } from "@/lib/quiz/public";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "QCM",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

function Message({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {children ? <p className="text-muted-foreground">{children}</p> : null}
    </section>
  );
}

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  });

export default async function QuizPage({ params }: PageProps<"/q/[token]">) {
  const { token } = await params;
  const state = await callQuiz("mg_quiz_session", token);

  return (
    <main id="main" className="mx-auto w-full max-w-3xl flex-1 space-y-6 p-4 sm:p-6">
      {(() => {
        switch (state.status) {
          case "invalid":
            return (
              <Message title="Ce lien ne fonctionne pas">
                Vérifie que tu as copié le lien en entier. S’il ne marche toujours pas, demande-en
                un nouveau à ton enseignante : l’ancien a peut-être été remplacé.
              </Message>
            );
          case "throttled":
            return (
              <Message title="Trop d’essais">
                Trop de liens invalides ont été essayés depuis ta connexion. Réessaie dans quelques
                minutes.
              </Message>
            );
          case "rate_limited":
            return (
              <Message title="Un instant">
                Cette page a été rechargée trop souvent. Attends une minute puis recharge : ta copie
                est conservée.
              </Message>
            );
          case "unavailable":
            return (
              <Message title="Le service ne répond pas">
                Réessaie dans un instant. Si tu avais commencé, tes réponses enregistrées ne sont
                pas perdues.
              </Message>
            );
          case "not_open":
            return (
              <Message title={String(state.title ?? "QCM")}>
                {state.opens_at
                  ? `Ce QCM ouvrira le ${dateTime(String(state.opens_at))}.`
                  : "Ce QCM n’est pas encore ouvert."}
              </Message>
            );
          case "window_closed":
            return (
              <Message title={String(state.title ?? "QCM")}>
                Ce QCM est fermé : il n’est plus possible de le commencer.
              </Message>
            );
          case "ready":
            return (
              <QuizStart
                token={token}
                title={String(state.title)}
                instructions={<Markdown source={String(state.instructions ?? "")} />}
                durationMinutes={
                  typeof state.duration_minutes === "number" ? state.duration_minutes : null
                }
                closesAt={typeof state.closes_at === "string" ? state.closes_at : null}
                questionCount={Number(state.question_count)}
                totalPoints={Number(state.total_points)}
              />
            );
          case "in_progress":
            return (
              <QuizRunner
                token={token}
                title={String(state.title)}
                instructions={String(state.instructions ?? "")}
                deadlineAt={typeof state.deadline_at === "string" ? state.deadline_at : null}
                serverNow={String(state.server_now)}
                questions={state.questions as never}
                initialAnswers={(state.answers ?? {}) as never}
              />
            );
          case "submitted":
            return <QuizResults state={state as unknown as SubmittedState} />;
          default:
            return <Message title="Page introuvable" />;
        }
      })()}
    </main>
  );
}
