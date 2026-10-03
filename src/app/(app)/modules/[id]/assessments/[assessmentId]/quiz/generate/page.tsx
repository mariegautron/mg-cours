import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  QuizGenerator,
  type GeneratorQuestion,
  type GeneratorResource,
} from "@/components/quiz/quiz-generator";
import { getAssessment } from "@/lib/assessments/queries";
import { listQuestionLinks } from "@/lib/questions/link-queries";
import { listQuestions } from "@/lib/questions/queries";
import { listResources } from "@/lib/resources/queries";

export const metadata: Metadata = { title: "Générer un QCM" };

export default async function GenerateQuizPage({
  params,
}: PageProps<"/modules/[id]/assessments/[assessmentId]/quiz/generate">) {
  const { id, assessmentId } = await params;
  const assessment = await getAssessment(assessmentId);
  if (!assessment || assessment.module_id !== id) notFound();
  const back = `/modules/${id}/assessments/${assessmentId}/quiz`;
  const [links, bank, resources] = await Promise.all([
    listQuestionLinks(),
    listQuestions(),
    listResources(),
  ]);

  const questions = new Map(bank.filter((q) => !q.archived_at).map((q) => [q.id, q]));
  const byResource = new Map<string, string[]>();
  for (const p of links.pairs) {
    if (questions.has(p.questionId))
      byResource.set(p.resourceId, [...(byResource.get(p.resourceId) ?? []), p.questionId]);
  }
  const generatorResources: GeneratorResource[] = resources
    .filter((r) => byResource.has(r.id))
    .map((r) => ({ id: r.id, title: r.title, questionIds: byResource.get(r.id)! }));
  const used = new Set(generatorResources.flatMap((r) => r.questionIds));
  const generatorQuestions: GeneratorQuestion[] = [...used].map((qid) => {
    const q = questions.get(qid)!;
    return { id: q.id, name: q.name, statement: q.statement.slice(0, 120) };
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-1">
        <Link
          href={back}
          className="text-muted-foreground text-sm underline-offset-2 hover:underline"
        >
          ← QCM de « {assessment.title} »
        </Link>
        <h1 className="text-2xl font-semibold">Générer un QCM depuis des ressources</h1>
        <p className="text-muted-foreground">
          Choisis les ressources, le nombre de questions, puis tire au sort ou compose à la main. Le
          QCM créé reste modifiable (consignes, durée, dates, règles).
        </p>
      </div>
      {!links.available ? (
        <p className="rounded-md border p-4 text-sm">
          La génération sera disponible après la mise à jour de la base de données.
        </p>
      ) : generatorResources.length === 0 ? (
        <p className="rounded-md border p-4 text-sm">
          Aucune ressource n’a encore de question liée. Lie des questions depuis la fiche d’une{" "}
          <Link href="/resources" className="underline underline-offset-2">
            ressource
          </Link>
          .
        </p>
      ) : (
        <QuizGenerator
          moduleId={id}
          assessmentId={assessmentId}
          resources={generatorResources}
          questions={generatorQuestions}
        />
      )}
    </div>
  );
}
