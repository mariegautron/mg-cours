import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { getAssessment } from "@/lib/assessments/queries";
import { evaluatedCriteria, subjectSections } from "@/lib/assessments/subject";

export const metadata: Metadata = { title: "Consignes : voir comme l’étudiant·e" };

/**
 * Aperçu des consignes de l'oral avant publication : ce que les étudiant·es liront (consigne, rendu
 * attendu, critères annoncés). Jamais de note, de commentaire ni de notes privées. Rien n'est publié ici.
 */
export default async function ConsignesPreviewPage({
  params,
}: {
  params: Promise<{ id: string; assessmentId: string }>;
}) {
  const { id, assessmentId } = await params;
  const assessment = await getAssessment(assessmentId);
  if (!assessment || assessment.module_id !== id) notFound();
  const sections = subjectSections(assessment);
  const criteria = evaluatedCriteria(assessment.grading_grid?.criteria ?? []);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div
        role="note"
        className="bg-sun/10 border-sun/50 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-sm"
      >
        <p>
          <strong>Aperçu.</strong> Voilà ce que les étudiant·es liront. Rien n’est publié depuis
          cette page.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href={`/modules/${id}/assessments/${assessmentId}`}>← Retour à l’évaluation</Link>
        </Button>
      </div>
      <article className="bg-card space-y-4 rounded-2xl border p-6">
        <h1 className="font-heading text-3xl font-bold tracking-tight">{assessment.title}</h1>
        <p className="text-muted-foreground text-sm">
          {assessment.is_group_grade ? "Oral de groupe" : "Oral individuel"}
          {assessment.date ? ` · ${new Date(assessment.date).toLocaleDateString("fr-FR")}` : ""}
          {assessment.duration_minutes ? ` · ${assessment.duration_minutes} min par passage` : ""}
        </p>
        {sections.length === 0 ? (
          <p className="text-muted-foreground">Aucune consigne rédigée pour l’instant.</p>
        ) : (
          sections.map((s) => (
            <section key={s.key} className="space-y-1">
              <h2 className="font-heading text-xl font-bold">{s.heading}</h2>
              {s.markdown ? <Markdown source={s.text} headingLevel={3} /> : <p>{s.text}</p>}
            </section>
          ))
        )}
        {criteria.length > 0 ? (
          <section className="space-y-1">
            <h2 className="font-heading text-xl font-bold">Critères</h2>
            <ul className="list-disc pl-5">
              {criteria.map((c) => (
                <li key={c.label}>
                  {c.label} · {c.points} point{c.points > 1 ? "s" : ""}
                  {c.bonus ? " (bonus)" : ""}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </article>
    </div>
  );
}
