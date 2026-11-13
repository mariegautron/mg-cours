import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { QuizRunner, type PublicQuestion } from "@/components/quiz/quiz-runner";
import { Button } from "@/components/ui/button";
import { getAssessment } from "@/lib/assessments/queries";
import { DrawError, drawQuiz } from "@/lib/quiz/draw";
import { getQuizByAssessment, loadBank } from "@/lib/quiz/queries";

export const metadata: Metadata = { title: "Essai à blanc du QCM" };
export const dynamic = "force-dynamic";

/**
 * Essai à blanc : tirage fait en mémoire, jamais enregistré. Aucune copie, aucun lien, aucun
 * changement d'état du QCM (il peut rester en brouillon).
 */
export default async function QuizTrialPage({
  params,
}: PageProps<"/modules/[id]/assessments/[assessmentId]/quiz/essai">) {
  const { id, assessmentId } = await params;
  const assessment = await getAssessment(assessmentId);
  if (!assessment || assessment.module_id !== id) notFound();
  const quiz = await getQuizByAssessment(assessmentId);
  if (!quiz) notFound();
  const back = `/modules/${id}/assessments/${assessmentId}/quiz`;

  let questions: PublicQuestion[];
  try {
    const result = drawQuiz({
      rules: quiz.rules,
      bank: await loadBank(quiz.id),
      seed: crypto.randomUUID(),
      shuffleQuestions: quiz.shuffle_questions,
      shuffleChoices: quiz.shuffle_choices,
    });
    questions = result.questions.map((q, i) => ({
      position: i + 1,
      type: q.type,
      statement: q.statement,
      points: q.points,
      choices: q.choices.map((c, k) => ({ id: k, text: c.text })),
    }));
  } catch (e) {
    return (
      <main className="mx-auto max-w-xl space-y-3 p-6">
        <h1 className="text-xl">Essai impossible</h1>
        <p role="alert">{e instanceof DrawError ? e.message : "Le tirage a échoué."}</p>
        <Button asChild variant="secondary">
          <Link href={back}>Retour au QCM</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-4">
      <QuizRunner
        token="essai"
        title={quiz.title}
        instructions={quiz.instructions}
        deadlineAt={null}
        serverNow={new Date().toISOString()}
        questions={questions}
        initialAnswers={{}}
        dryRun
        exitHref={back}
      />
    </main>
  );
}
