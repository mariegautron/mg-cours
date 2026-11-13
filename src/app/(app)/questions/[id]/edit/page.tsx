import type { Metadata } from "next";
import { notFound } from "next/navigation";

import type { QuestionType } from "@/lib/questions/types";
import { QuestionForm } from "@/components/questions/question-form";
import { questionUsage } from "@/lib/quiz/question-usage";
import { getQuestion, listQuestions, toQuestionInput } from "@/lib/questions/queries";

export const metadata: Metadata = { title: "Modifier la question" };

export default async function EditQuestionPage({ params }: PageProps<"/questions/[id]/edit">) {
  const { id } = await params;
  const [question, all] = await Promise.all([getQuestion(id), listQuestions()]);
  if (!question) notFound();
  const usage = await questionUsage({
    id: question.id,
    category: question.category,
    name: question.name,
    type: question.type as QuestionType,
    statement: question.statement,
    generalFeedback: question.general_feedback,
    tags: question.tags,
    numericValue: question.numeric_value === null ? null : Number(question.numeric_value),
    numericTolerance:
      question.numeric_tolerance === null ? null : Number(question.numeric_tolerance),
    choices: question.choices.map((c) => ({
      text: c.text,
      fraction: Number(c.fraction),
      feedback: c.feedback,
    })),
  });
  const categories = [...new Set(all.map((q) => q.category).filter(Boolean))];
  return (
    <div className="space-y-6">
      <h1>Modifier « {question.name} »</h1>
      <p className="text-muted-foreground max-w-2xl text-sm">
        Les QCM déjà passés gardent la version de la question telle qu’elle était à ce moment-là.
      </p>
      <p role="note" className="max-w-2xl rounded-xl border p-3 text-sm">
        Utilisée dans {usage.quizzes} QCM, dont {usage.withDraws} avec des tirages préparés.{" "}
        {usage.withDraws > 0
          ? "Si tu corriges la question, les tirages déjà préparés gardent l’ancienne version ; seuls les nouveaux tirages (ou « Refaire le tirage ») utilisent la nouvelle."
          : "Aucun tirage préparé n’est concerné par une correction."}
      </p>
      <QuestionForm id={id} initial={toQuestionInput(question)} categories={categories} />
    </div>
  );
}
