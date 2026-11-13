import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Pill } from "@/components/dashboard/pill";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";
import { getAssessment } from "@/lib/assessments/queries";
import { getQuizByAssessment, listAttempts } from "@/lib/quiz/queries";
import { averageScore, questionStats, type StatAttempt } from "@/lib/quiz/stats";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Résultats du QCM" };

const fmt = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

/** Résultats d'un QCM côté enseignante (maquette « QcmResultats ») : ce qui a posé problème, notes. */
export default async function QuizResultsPage({
  params,
}: PageProps<"/modules/[id]/assessments/[assessmentId]/quiz/results">) {
  const { id, assessmentId } = await params;
  const assessment = await getAssessment(assessmentId);
  if (!assessment || assessment.module_id !== id) notFound();
  const quiz = await getQuizByAssessment(assessmentId);
  if (!quiz) notFound();
  const back = `/modules/${id}/assessments/${assessmentId}`;

  const supabase = await createClient();
  const [attempts, { data: rows }] = await Promise.all([
    listAttempts(quiz.id),
    supabase
      .from("quiz_attempt")
      .select("drawn, result")
      .eq("quiz_id", quiz.id)
      .eq("status", "submitted"),
  ]);
  const statAttempts: StatAttempt[] = (rows ?? []).map((r) => {
    const drawn = (r.drawn ?? []) as { question_id: string; statement: string; points: number }[];
    const review = (
      (r.result as { review?: { earned: number | null }[] } | null)?.review ?? []
    ).map((x) => x.earned);
    return { drawn, earned: drawn.map((_, i) => review[i] ?? null) };
  });
  const stats = questionStats(statAttempts);
  const submitted = attempts.filter((a) => a.status === "submitted");
  const scores = submitted.filter((a) => a.reviewComplete).map((a) => a.score);
  const average = averageScore(scores);
  const total = submitted[0]?.totalPoints ?? null;
  const card = "bg-card rounded-xl border p-5";

  const toReview = submitted.filter((a) => !a.reviewComplete).length;
  const notTaken = attempts.filter((a) => a.status !== "submitted").length;
  const corrected = submitted.length - toReview;
  const firstToReview = submitted.find((a) => !a.reviewComplete);

  const problems =
    corrected >= 3 ? (
      // Repliée, les 3 plus ratées : la carte Notes et le bouton principal restent en haut.
      <details className={card}>
        <summary className="font-heading min-h-11 cursor-pointer text-lg font-bold">
          Ce qui a posé problème
        </summary>
        <ul className="mt-2 space-y-3">
          {stats.slice(0, 3).map((s) => (
            <li key={s.questionId} className="space-y-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <div className="min-w-0 flex-1">
                  <Markdown source={s.statement} headingLevel={4} />
                </div>
                <strong>
                  {s.percent === null ? "pas encore corrigée" : `${s.percent} % de réussite`}
                </strong>
              </div>
              {s.percent !== null ? (
                <div
                  role="img"
                  aria-label={`${s.percent} % de réussite`}
                  className="bg-muted h-2 overflow-hidden rounded-full"
                >
                  <span
                    className={`block h-full ${s.percent < 50 ? "bg-coral" : s.percent < 80 ? "bg-sun" : "bg-mint"}`}
                    style={{ width: `${s.percent}%` }}
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground mt-2 text-sm">
          Les questions les plus ratées te disent quoi reprendre au prochain cours.
        </p>
      </details>
    ) : null;

  return (
    <div className="max-w-4xl space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl">Résultats du QCM</h1>
        <p className="text-muted-foreground">
          {submitted.length} personne{submitted.length > 1 ? "s ont" : " a"} passé le QCM
          {average !== null && total !== null
            ? `. Moyenne ${fmt(average)} sur ${fmt(total)}.`
            : "."}
        </p>
      </div>

      <section
        aria-labelledby="ou"
        className="bg-primary/10 border-primary/50 space-y-2 rounded-xl border p-5"
      >
        <h2 id="ou" className="text-sm font-semibold">
          Donner les notes
        </h2>
        {toReview > 0 || notTaken > 0 ? (
          <p className="text-sm">
            {toReview > 0 ? `${toReview} copie${toReview > 1 ? "s" : ""} à relire` : ""}
            {toReview > 0 && notTaken > 0 ? ", " : ""}
            {notTaken > 0
              ? `${notTaken} personne${notTaken > 1 ? "s n’ont" : " n’a"} pas passé le QCM`
              : ""}
            .
          </p>
        ) : null}
        <p className="text-muted-foreground text-sm">
          Le corrigé s’ouvre aux étudiant·es quand tout le monde a passé le QCM, rattrapages
          compris. Jamais avant.
        </p>
        <div className="flex flex-wrap gap-2">
          {firstToReview ? (
            <Button asChild size="touch">
              <Link href={`${back}/quiz/attempts/${firstToReview.id}`}>
                Relire les copies ({toReview})
              </Link>
            </Button>
          ) : null}
          <Button asChild size="touch" variant={firstToReview ? "outline" : "default"}>
            <Link href={`${back}/results`}>Publier les résultats</Link>
          </Button>
          <Button asChild variant="ghost" size="touch">
            <Link href={`${back}/quiz/links`}>← Suivi des copies</Link>
          </Button>
        </div>
      </section>

      <section aria-labelledby="nq" className={card}>
        <h2 id="nq" className="mb-2 text-sm font-semibold">
          Notes
        </h2>
        {attempts.length === 0 ? (
          <p className="text-muted-foreground text-sm">Aucune copie.</p>
        ) : (
          <ul className="divide-y text-sm">
            {attempts.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                {a.status === "submitted" || a.status === "in_progress" ? (
                  <Link
                    href={`${back}/quiz/attempts/${a.id}`}
                    className="font-medium underline underline-offset-2"
                  >
                    {a.name}
                  </Link>
                ) : (
                  <span>{a.name}</span>
                )}
                {a.status === "submitted" ? (
                  a.reviewComplete && a.score !== null ? (
                    <strong>
                      {fmt(a.score)} / {fmt(a.totalPoints)}
                    </strong>
                  ) : (
                    <Pill tone="warn">À relire</Pill>
                  )
                ) : (
                  <Pill tone="warn">{a.status === "in_progress" ? "En cours" : "Pas passé"}</Pill>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {problems}
    </div>
  );
}
