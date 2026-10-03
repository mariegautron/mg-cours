import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Pill } from "@/components/dashboard/pill";
import { Button } from "@/components/ui/button";
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
  const scores = submitted.map((a) => a.score);
  const average = averageScore(scores);
  const total = submitted[0]?.totalPoints ?? null;
  const card = "bg-card rounded-xl border p-5";

  return (
    <div className="flex max-w-6xl flex-col gap-5 lg:flex-row lg:items-start">
      <section aria-labelledby="qr" className={`${card} min-w-0 flex-[3_1_0] space-y-3`}>
        <p className="text-primary text-xs font-bold tracking-widest uppercase">Évaluations</p>
        <h1 id="qr" className="font-heading text-3xl font-bold tracking-tight">
          Résultats du QCM
        </h1>
        <p className="text-muted-foreground">
          {submitted.length} personne{submitted.length > 1 ? "s ont" : " a"} passé le QCM
          {average !== null && total !== null
            ? `. Moyenne ${fmt(average)} sur ${fmt(total)}.`
            : "."}
        </p>
        <h2 className="font-heading text-lg font-bold">Ce qui a posé problème</h2>
        {stats.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Pas encore de copie rendue et corrigée : les questions les plus ratées apparaîtront ici.
          </p>
        ) : (
          <ul className="space-y-3">
            {stats.slice(0, 10).map((s) => (
              <li key={s.questionId} className="space-y-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <span>{s.statement}</span>
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
        )}
        <p className="text-muted-foreground text-sm">
          Les questions les plus ratées te disent quoi reprendre au prochain cours.
        </p>
      </section>

      <div className="min-w-0 flex-[2_1_0] space-y-4 lg:max-w-md">
        <section aria-labelledby="nq" className={card}>
          <h2 id="nq" className="font-heading mb-2 text-lg font-bold">
            Notes
          </h2>
          {attempts.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucune copie.</p>
          ) : (
            <ul className="divide-y text-sm">
              {attempts.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>{a.name}</span>
                  {a.status === "submitted" ? (
                    <strong>
                      {a.score === null ? "à relire" : fmt(a.score)}
                      {a.score !== null ? ` / ${fmt(a.totalPoints)}` : ""}
                    </strong>
                  ) : (
                    <Pill tone="warn">{a.status === "in_progress" ? "En cours" : "Pas passé"}</Pill>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section
          aria-labelledby="ou"
          className="bg-primary/10 border-primary/50 space-y-2 rounded-xl border p-5"
        >
          <h2 id="ou" className="font-heading text-lg font-bold">
            Donner les notes
          </h2>
          <p className="text-muted-foreground text-sm">
            Le corrigé s’ouvre aux étudiant·es quand tout le monde a passé le QCM, rattrapages
            compris. Jamais avant.
          </p>
          <Button asChild size="touch">
            <Link href={`${back}/results`}>Publier les résultats</Link>
          </Button>
          <div>
            <Button asChild variant="ghost" size="touch">
              <Link href={`${back}/quiz/links`}>← Suivi des copies</Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
