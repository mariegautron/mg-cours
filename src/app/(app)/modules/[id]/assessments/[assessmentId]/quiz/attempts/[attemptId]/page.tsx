import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { saveManualScores } from "@/app/(app)/modules/[id]/assessments/[assessmentId]/quiz/actions";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { gradeAttempt, readAnswer } from "@/lib/quiz/grading";
import type { DrawnQuestion } from "@/lib/quiz/types";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Copie de QCM" };

const fmt = (n: number | null) => (n === null ? "—" : String(n).replace(".", ","));

export default async function AttemptPage({
  params,
  searchParams,
}: PageProps<"/modules/[id]/assessments/[assessmentId]/quiz/attempts/[attemptId]">) {
  const { id, assessmentId, attemptId } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: attempt } = await supabase
    .from("quiz_attempt")
    .select("*, student:student_id(first_name, last_name), quiz:quiz_id(assessment_id)")
    .eq("id", attemptId)
    .maybeSingle();
  if (
    !attempt ||
    (attempt.quiz as unknown as { assessment_id: string }).assessment_id !== assessmentId
  )
    notFound();

  const student = attempt.student as unknown as { first_name: string; last_name: string };
  const drawn = attempt.drawn as unknown as DrawnQuestion[];
  const answers = (attempt.answers ?? {}) as Record<string, unknown>;
  const manual = (attempt.manual_scores ?? {}) as Record<string, unknown>;
  const grade = gradeAttempt(drawn, answers, manual);
  const back = `/modules/${id}/assessments/${assessmentId}/quiz`;

  return (
    <div className="max-w-3xl space-y-6">
      <nav aria-label="Fil d’Ariane" className="text-muted-foreground text-sm">
        <Link href={back} className="underline-offset-2 hover:underline">
          Suivi du QCM
        </Link>
      </nav>
      <h1 className="text-2xl font-semibold">
        Copie de {student.first_name} {student.last_name}
      </h1>
      <p className="text-sm">
        {fmt(grade.score)} / {fmt(grade.totalPoints)} points
        {grade.complete ? "" : " (partiel : il reste des réponses libres à relire)"}.
        {attempt.submitted_late ? " Copie rendue après l’heure limite." : ""}
      </p>
      {typeof error === "string" ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
      {attempt.late_answers ? (
        <p role="status" className="rounded-md border p-3 text-sm">
          L’étudiant·e a modifié sa copie après l’heure limite : ces modifications sont conservées
          mais pas comptées. Tu peux les prendre en compte depuis le suivi.
        </p>
      ) : null}

      <form action={saveManualScores.bind(null, id, assessmentId, attemptId)} className="space-y-4">
        {drawn.map((q, i) => {
          const position = i + 1;
          const g = grade.questions[i];
          const answer = readAnswer(answers[String(position)], q);
          return (
            <section
              key={position}
              aria-labelledby={`q${position}`}
              className="space-y-2 rounded-lg border p-4"
            >
              <h2 id={`q${position}`} className="text-sm font-medium">
                Question {position} · {fmt(q.points)} pt{q.points > 1 ? "s" : ""}
                {g.earned !== null ? ` · obtenus : ${fmt(g.earned)}` : " · à relire"}
              </h2>
              <Markdown source={q.statement} />
              {q.type === "open" ? (
                <>
                  <p className="text-sm font-medium">Réponse :</p>
                  <p className="bg-muted/40 rounded p-2 text-sm whitespace-pre-wrap">
                    {answer && "text" in answer && answer.text.trim()
                      ? answer.text
                      : "Pas de réponse."}
                  </p>
                  <div className="space-y-1">
                    <Label htmlFor={`score_${position}`}>Points donnés (sur {fmt(q.points)})</Label>
                    <Input
                      id={`score_${position}`}
                      name={`score_${position}`}
                      inputMode="decimal"
                      className="w-28"
                      defaultValue={
                        typeof manual[String(position)] === "number"
                          ? String(manual[String(position)]).replace(".", ",")
                          : ""
                      }
                    />
                  </div>
                </>
              ) : q.type === "numerical" ? (
                <p className="text-sm">
                  Réponse :{" "}
                  <strong>
                    {answer && "number" in answer && answer.number.trim()
                      ? answer.number
                      : "aucune"}
                  </strong>{" "}
                  — attendu : {q.numeric_value}
                  {q.numeric_tolerance ? ` (± ${q.numeric_tolerance})` : ""}
                </p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {q.choices.map((c, k) => {
                    const chosen = answer && "choices" in answer && answer.choices.includes(k);
                    return (
                      <li key={k}>
                        <span className="font-medium">
                          {chosen ? "Cochée" : "Non cochée"}
                          {c.fraction > 0
                            ? " · bonne réponse"
                            : c.fraction < 0
                              ? " · pénalisée"
                              : ""}
                          {" : "}
                        </span>
                        {c.text}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
        {drawn.some((q) => q.type === "open") ? (
          <Button type="submit">Enregistrer la relecture</Button>
        ) : null}
      </form>
    </div>
  );
}
