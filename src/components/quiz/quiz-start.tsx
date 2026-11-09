"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ActionError } from "@/components/action-error";
import { startQuiz } from "@/app/q/[token]/actions";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import type { PublicQuizState } from "@/lib/quiz/public";
import { Button } from "@/components/ui/button";

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  });

export function QuizStart({
  token,
  title,
  instructions,
  durationMinutes,
  closesAt,
  questionCount,
  totalPoints,
}: {
  token: string;
  title: string;
  instructions: React.ReactNode;
  durationMinutes: number | null;
  closesAt: string | null;
  questionCount: number;
  totalPoints: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Copie commencée : les questions s'affichent tout de suite, sans recharger la page.
  const [started, setStarted] = useState<PublicQuizState | null>(null);

  const start = () =>
    startTransition(async () => {
      const result = await startQuiz(token);
      if (result.status === "in_progress" && Array.isArray(result.questions)) setStarted(result);
      else if (result.status === "in_progress" || result.status === "submitted") router.refresh();
      else if (result.status === "unavailable")
        setError("Le service ne répond pas. Réessayez dans un instant.");
      else
        setError(
          "Ce QCM n’est pas ouvert en ce moment : il est peut-être fermé ou pas encore ouvert. Rechargez la page.",
        );
    });

  if (started) {
    return (
      <QuizRunner
        token={token}
        title={String(started.title ?? title)}
        instructions={String(started.instructions ?? "")}
        deadlineAt={typeof started.deadline_at === "string" ? started.deadline_at : null}
        serverNow={String(started.server_now ?? new Date().toISOString())}
        questions={started.questions as never}
        initialAnswers={(started.answers ?? {}) as never}
      />
    );
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {instructions}
      <ul className="list-disc space-y-1 pl-5 text-sm">
        <li>
          {questionCount} question{questionCount > 1 ? "s" : ""},{" "}
          {String(totalPoints).replace(".", ",")} point{totalPoints > 1 ? "s" : ""}.
        </li>
        <li>
          {durationMinutes
            ? `Vous avez ${durationMinutes} minutes une fois commencé : le décompte démarre quand vous cliquez sur « Commencer ».`
            : "Pas de limite de temps."}
        </li>
        {closesAt ? <li>À rendre avant le {dateTime(closesAt)}.</li> : null}
        <li>Vos réponses sont enregistrées au fur et à mesure.</li>
        <li>Ce lien est personnel : ne le partagez pas.</li>
      </ul>
      <Button type="button" onClick={start} disabled={pending}>
        {pending ? "Ouverture…" : "Commencer"}
      </Button>
      {error ? <ActionError error={error} /> : null}
    </section>
  );
}
