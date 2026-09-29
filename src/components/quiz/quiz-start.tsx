"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { startQuiz } from "@/app/q/[token]/actions";
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

  const start = () =>
    startTransition(async () => {
      const result = await startQuiz(token);
      if (result.status === "in_progress" || result.status === "submitted") router.refresh();
      else if (result.status === "unavailable")
        setError("Le service ne répond pas. Réessaie dans un instant.");
      else
        setError(
          "Ce QCM n’est pas ouvert en ce moment : il est peut-être fermé ou pas encore ouvert. Recharge la page.",
        );
    });

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
            ? `Tu as ${durationMinutes} minutes une fois commencé : le décompte démarre quand tu cliques sur « Commencer ».`
            : "Pas de limite de temps."}
        </li>
        {closesAt ? <li>À rendre avant le {dateTime(closesAt)}.</li> : null}
        <li>Tes réponses sont enregistrées au fur et à mesure.</li>
        <li>Ce lien est personnel : ne le partage pas.</li>
      </ul>
      <Button type="button" onClick={start} disabled={pending}>
        {pending ? "Ouverture…" : "Commencer"}
      </Button>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </section>
  );
}
