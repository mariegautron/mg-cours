import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionError } from "@/components/action-error";
import { AttemptReview } from "@/components/quiz/attempt-review";
import { Markdown } from "@/components/markdown";
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
  const back = `/modules/${id}/assessments/${assessmentId}/quiz/links`;
  // Copies rendues, par ordre alphabétique : précédente / suivante.
  const { data: siblings } = await supabase
    .from("quiz_attempt")
    .select("id, student:student_id(first_name, last_name)")
    .eq("quiz_id", attempt.quiz_id)
    .eq("status", "submitted");
  const ordered = (siblings ?? [])
    .map((a) => {
      const st = a.student as unknown as { first_name: string; last_name: string } | null;
      return { id: a.id, name: st ? `${st.last_name} ${st.first_name}` : "" };
    })
    .sort((x, y) => x.name.localeCompare(y.name, "fr"));
  const at = ordered.findIndex((o) => o.id === attemptId);
  const neighbor = (d: -1 | 1) => {
    const target = at === -1 ? undefined : ordered[at + d];
    return target ? `/modules/${id}/assessments/${assessmentId}/quiz/attempts/${target.id}` : null;
  };

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
      {typeof error === "string" ? <ActionError error={error} /> : null}
      {attempt.late_answers ? (
        <p role="status" className="rounded-md border p-3 text-sm">
          L’étudiant·e a modifié sa copie après l’heure limite : ces modifications sont conservées
          mais pas comptées. Tu peux les prendre en compte depuis le suivi.
        </p>
      ) : null}

      <AttemptReview
        moduleId={id}
        assessmentId={assessmentId}
        attemptId={attemptId}
        totalPoints={grade.totalPoints}
        initialScore={grade.score}
        initialComplete={grade.complete}
        prevHref={neighbor(-1)}
        nextHref={neighbor(1)}
        questions={drawn.map((q, i) => {
          const position = i + 1;
          const g = grade.questions[i];
          const answer = readAnswer(answers[String(position)], q);
          const m = manual[String(position)];
          const c = manual[`c${position}`];
          return {
            position,
            points: q.points,
            open: q.type === "open",
            earned: g.earned,
            initialScore: typeof m === "number" ? String(m).replace(".", ",") : "",
            initialComment: typeof c === "string" ? c : "",
            body: (
              <>
                <Markdown source={q.statement} />
                {q.type === "open" ? (
                  <>
                    <p className="text-sm font-medium">Réponse :</p>
                    <p className="bg-muted/40 rounded p-2 text-sm whitespace-pre-wrap">
                      {answer && "text" in answer && answer.text.trim()
                        ? answer.text
                        : "Pas de réponse."}
                    </p>
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
                    {q.choices.map((ch, k) => {
                      const chosen = answer && "choices" in answer && answer.choices.includes(k);
                      return (
                        <li key={k}>
                          <span className="font-medium">
                            {chosen ? "Cochée" : "Non cochée"}
                            {ch.fraction > 0
                              ? " · bonne réponse"
                              : ch.fraction < 0
                                ? " · pénalisée"
                                : ""}
                            {" : "}
                          </span>
                          {ch.text}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            ),
          };
        })}
      />
    </div>
  );
}
