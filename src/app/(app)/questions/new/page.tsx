import type { Metadata } from "next";

import { QuestionForm } from "@/components/questions/question-form";
import { listQuestions } from "@/lib/questions/queries";

export const metadata: Metadata = { title: "Nouvelle question" };

export default async function NewQuestionPage() {
  const categories = [...new Set((await listQuestions()).map((q) => q.category).filter(Boolean))];
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Nouvelle question</h1>
      <QuestionForm id={null} categories={categories} />
    </div>
  );
}
