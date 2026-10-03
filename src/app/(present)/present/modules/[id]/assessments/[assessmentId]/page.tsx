import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PresentShell } from "@/components/present/present-shell";
import { cadreSlides, gridSlidesOf, subjectSlides } from "@/components/present/deck";
import { Button } from "@/components/ui/button";
import { loadSubjectDeck } from "@/lib/assessments/present-data";
import { getAssessment } from "@/lib/assessments/queries";
import { canPresent } from "@/lib/assessments/subject";
import { getModule } from "@/lib/modules/queries";

export async function generateMetadata({
  params,
}: PageProps<"/present/modules/[id]/assessments/[assessmentId]">): Promise<Metadata> {
  const { assessmentId } = await params;
  const assessment = await getAssessment(assessmentId);
  return { title: assessment ? `Sujet — ${assessment.title}` : "Sujet" };
}

/** Sujet d'une évaluation projeté (contenu étudiant·es seulement : jamais notes, carnet ni fichiers). */
export default async function PresentAssessmentPage({
  params,
}: PageProps<"/present/modules/[id]/assessments/[assessmentId]">) {
  const { id, assessmentId } = await params;
  const [mod, assessment] = await Promise.all([getModule(id), getAssessment(assessmentId)]);
  if (!mod || !assessment || assessment.module_id !== id) notFound();

  const backHref = `/modules/${id}/assessments/${assessmentId}`;
  const subject = await loadSubjectDeck(assessmentId);
  if (!subject) {
    return (
      <main className="mx-auto max-w-xl space-y-4 p-8">
        <h1 className="text-2xl font-semibold">{assessment.title}</h1>
        <p role="status">
          {canPresent(assessment.prep_status)
            ? "Ce sujet est vide : renseigne la consigne avant de le projeter."
            : "Ce sujet est encore « à construire » : passe-le à « Prête » avant de le projeter."}
        </p>
        <Button asChild variant="secondary">
          <Link href={backHref}>Retour à l’évaluation</Link>
        </Button>
      </main>
    );
  }

  // Intercalaire, cadre (quand, avec qui, rendu, notation), sujet, puis la grille critère par critère.
  const base = subjectSlides(0, subject);
  const slides = [
    ...base.slice(0, 1),
    ...cadreSlides(0, subject),
    ...base.slice(1),
    ...gridSlidesOf(0, subject),
  ];

  return (
    <PresentShell
      title={`${mod.name} — Sujet : ${assessment.title}`}
      backHref={backHref}
      backLabel="l’évaluation"
      sections={["Sujet"]}
      slides={slides}
    />
  );
}
