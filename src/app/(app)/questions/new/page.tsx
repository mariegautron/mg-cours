import type { Metadata } from "next";

import { QuestionForm } from "@/components/questions/question-form";
import { listQuestions } from "@/lib/questions/queries";
import { getResource } from "@/lib/resources/queries";

export const metadata: Metadata = { title: "Nouvelle question" };

export default async function NewQuestionPage({ searchParams }: PageProps<"/questions/new">) {
  const sp = await searchParams;
  const resourceId = typeof sp.resource === "string" ? sp.resource : "";
  const [questions, resource] = await Promise.all([
    listQuestions(),
    /^[0-9a-f-]{36}$/i.test(resourceId) ? getResource(resourceId) : Promise.resolve(null),
  ]);
  const categories = [...new Set(questions.map((q) => q.category).filter(Boolean))];
  return (
    <div className="space-y-6">
      <div>
        {resource ? (
          <p className="text-muted-foreground text-[0.8125rem] font-medium">
            Pour la ressource « {resource.title} »
          </p>
        ) : null}
        <h1>Nouvelle question</h1>
        {sp.ajoutee === "1" ? (
          <p role="status" className="text-mint text-sm font-semibold">
            Question ajoutée. Tu peux écrire la suivante.
          </p>
        ) : null}
      </div>
      <QuestionForm
        id={null}
        categories={categories}
        resource={resource ? { id: resource.id, title: resource.title } : undefined}
      />
    </div>
  );
}
