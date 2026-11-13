import Link from "next/link";

import { Markdown } from "@/components/markdown";
import { gradeAttempt, readAnswer } from "@/lib/quiz/grading";
import type { DrawnQuestion } from "@/lib/quiz/types";

const fmt = (n: number | null) => (n === null ? "—" : String(n).replace(".", ","));

/**
 * Réponses d'une personne à son QCM, affichées en lecture seule pendant la correction (replié par
 * défaut). La relecture et les points des questions libres se font dans le suivi du QCM.
 */
export function QcmAnswersPanel({
  name,
  drawn,
  answers,
  manual,
  reviewHref,
}: {
  name: string;
  drawn: DrawnQuestion[];
  answers: Record<string, unknown>;
  manual: Record<string, unknown>;
  reviewHref: string;
}) {
  const grade = gradeAttempt(drawn, answers, manual);
  return (
    <details className="bg-card mb-3 rounded-xl border p-3 text-sm shadow-sm">
      <summary className="min-h-8 cursor-pointer font-bold">
        Réponses au QCM de {name} ·{" "}
        <span className="font-normal">
          {fmt(grade.score)} / {fmt(grade.totalPoints)} pts
          {grade.complete ? "" : " (partiel : réponses libres à relire)"}
        </span>
      </summary>
      <div className="space-y-3 pt-3">
        {drawn.map((q, i) => {
          const g = grade.questions[i];
          const answer = readAnswer(answers[String(i + 1)], q);
          return (
            <section key={i} className="space-y-1 border-t pt-2 first:border-t-0 first:pt-0">
              <h3 className="text-sm font-semibold">
                Question {i + 1} · {fmt(q.points)} pt{q.points > 1 ? "s" : ""}
                {g.earned !== null ? ` · obtenus : ${fmt(g.earned)}` : " · à relire"}
              </h3>
              <Markdown source={q.statement} />
              {q.type === "open" ? (
                <p className="bg-muted/40 rounded p-2 whitespace-pre-wrap">
                  {answer && "text" in answer && answer.text.trim()
                    ? answer.text
                    : "Pas de réponse."}
                </p>
              ) : q.type === "numerical" ? (
                <p>
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
                <ul className="space-y-0.5">
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
        <Link href={reviewHref} className="font-semibold underline underline-offset-2">
          Relire cette copie (points des réponses libres)
        </Link>
      </div>
    </details>
  );
}
