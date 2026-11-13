import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Markdown } from "@/components/markdown";
import type { DrawnQuestion } from "@/lib/quiz/types";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Questions tirées" };

/** Les questions tirées pour une personne (vue privée : avec les bonnes réponses). */
export default async function DrawnQuestionsPage({
  params,
}: PageProps<"/modules/[id]/assessments/[assessmentId]/quiz/attempts/[attemptId]/tirage">) {
  const { id, assessmentId, attemptId } = await params;
  const supabase = await createClient();
  const { data: attempt } = await supabase
    .from("quiz_attempt")
    .select("drawn, student:student_id(first_name, last_name), quiz:quiz_id(assessment_id)")
    .eq("id", attemptId)
    .maybeSingle();
  if (
    !attempt ||
    (attempt.quiz as unknown as { assessment_id: string }).assessment_id !== assessmentId
  )
    notFound();
  const student = attempt.student as unknown as { first_name: string; last_name: string };
  const drawn = attempt.drawn as unknown as DrawnQuestion[];

  return (
    <div className="max-w-3xl space-y-5">
      <Link
        href={`/modules/${id}/assessments/${assessmentId}/quiz/links#follow`}
        className="text-muted-foreground text-sm underline underline-offset-2"
      >
        ← Suivi des copies
      </Link>
      <h1 className="text-xl">
        Questions tirées pour {student.first_name} {student.last_name}
      </h1>
      <p className="text-muted-foreground text-sm">
        {drawn.length} question{drawn.length > 1 ? "s" : ""}. Cette vue est privée : elle montre
        aussi les bonnes réponses.
      </p>
      <ol className="space-y-4">
        {drawn.map((q, i) => (
          <li key={q.question_id} className="bg-card rounded-xl border p-4">
            <p className="text-muted-foreground mb-1 text-sm">
              Question {i + 1} · {String(q.points).replace(".", ",")} pt{q.points >= 2 ? "s" : ""}
            </p>
            <Markdown source={q.statement} />
            {q.choices.length ? (
              <ul className="mt-2 space-y-0.5 text-sm">
                {q.choices.map((c, k) => (
                  <li key={k}>
                    {c.fraction > 0 ? <strong>✓ {c.text}</strong> : <span>{c.text}</span>}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
