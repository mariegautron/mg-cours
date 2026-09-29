import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { QuestionForm } from "@/components/questions/question-form";
import { getQuestion, listQuestions, toQuestionInput } from "@/lib/questions/queries";

export const metadata: Metadata = { title: "Modifier la question" };

export default async function EditQuestionPage({ params }: PageProps<"/questions/[id]/edit">) {
  const { id } = await params;
  const [question, all] = await Promise.all([getQuestion(id), listQuestions()]);
  if (!question) notFound();
  const categories = [...new Set(all.map((q) => q.category).filter(Boolean))];
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Modifier « {question.name} »</h1>
      <p className="text-muted-foreground max-w-2xl text-sm">
        Les QCM déjà passés gardent la version de la question telle qu’elle était à ce moment-là.
      </p>
      <QuestionForm id={id} initial={toQuestionInput(question)} categories={categories} />
    </div>
  );
}
