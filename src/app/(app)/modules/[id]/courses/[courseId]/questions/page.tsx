import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { setResourceQuestions } from "@/app/(app)/questions/link-actions";
import { EmptyState } from "@/components/empty-state";
import { LinkPicker } from "@/components/questions/link-picker";
import { Button } from "@/components/ui/button";
import { getCourseResourcesFull, getModule, getModuleCourses } from "@/lib/modules/queries";
import { listQuestionLinks } from "@/lib/questions/link-queries";
import { listQuestions } from "@/lib/questions/queries";

export const metadata: Metadata = { title: "Questions de la séance" };

/**
 * Lier des questions aux ressources du déroulé d'une séance, sans quitter la séance : le quiz de fin
 * de séance reprend les questions des ressources de son déroulé.
 */
export default async function CourseQuestionsPage({
  params,
}: PageProps<"/modules/[id]/courses/[courseId]/questions">) {
  const { id, courseId } = await params;
  const [mod, courses, resources, links, bank] = await Promise.all([
    getModule(id),
    getModuleCourses(id),
    getCourseResourcesFull(courseId),
    listQuestionLinks(),
    listQuestions(),
  ]);
  const course = courses.find((c) => c.id === courseId);
  if (!mod || !course) notFound();
  const back = `/modules/${id}/courses/${courseId}`;
  const items = bank
    .filter((q) => !q.archived_at)
    .map((q) => ({ id: q.id, label: q.name, hint: q.category || undefined }));

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-primary mb-1.5 text-xs font-bold tracking-widest uppercase">
            {mod.name}
          </p>
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            Questions de la séance : {course.title}
          </h1>
          <p className="text-muted-foreground mt-1">
            Les questions se lient aux ressources. Le quiz de fin de séance reprend celles des
            ressources du déroulé de cette séance.
          </p>
        </div>
        <Button asChild variant="ghost">
          <Link href={back}>← Retour à la séance</Link>
        </Button>
      </div>

      {!links.available ? (
        <p className="text-muted-foreground">
          Les questions liées seront disponibles après la mise à jour de la base de données.
        </p>
      ) : resources.length === 0 ? (
        <EmptyState
          title="Aucune ressource dans le déroulé"
          description="Ajoute d’abord une ressource au déroulé de la séance : tu pourras ensuite lui lier des questions."
          actions={[{ label: "Ajouter une ressource au déroulé", href: `${back}#deroule` }]}
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="La banque de questions est vide"
          description="Écris ou importe des questions, puis reviens les lier aux ressources."
          actions={[{ label: "Ouvrir la banque de questions", href: "/questions" }]}
        />
      ) : (
        <ul className="space-y-3">
          {resources.map((r) => {
            const linked = links.pairs
              .filter((p) => p.resourceId === r.id)
              .map((p) => p.questionId);
            return (
              <li key={r.id} className="bg-card rounded-2xl border p-4">
                <details open={resources.length === 1}>
                  <summary className="min-h-11 cursor-pointer py-1 font-semibold">
                    {r.title}
                    <span className="text-muted-foreground font-normal">
                      {" "}
                      · {linked.length} question{linked.length > 1 ? "s" : ""} liée
                      {linked.length > 1 ? "s" : ""}
                    </span>
                  </summary>
                  <div className="mt-3">
                    <LinkPicker
                      action={setResourceQuestions.bind(null, r.id)}
                      items={items}
                      selected={linked}
                      legend={`Questions liées à « ${r.title} »`}
                      filterLabel="Chercher une question"
                      idPrefix={`q-${r.id}`}
                    />
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
