import { ProjectionGuard } from "@/components/assessments/projection-guard";
import { ObjectCrumbs } from "@/components/nav/place-nav";
import { getAssessment } from "@/lib/assessments/queries";

/** Sous-pages d'une évaluation, pour le fil d'Ariane (Modules › SCRUM › Évaluations › Étude de cas › Corriger). */
const SUB_PAGES: Record<string, string> = {
  "quiz/links": "Liens et suivi des copies",
  "quiz/results": "Résultats du QCM",
  "quiz/essai": "Essai à blanc",
  "quiz/generate": "Générer des questions",
  "quiz/qr": "QR code",
  "quiz/attempts": "Copie",
  "results/preview": "Aperçu",
  correct: "Corriger",
  compare: "Comparer",
  edit: "Modifier",
  oral: "Faire passer l’oral",
  consignes: "Consignes",
  phrases: "Phrases",
  quiz: "QCM en ligne",
  results: "Résultats",
  etape: "Point d’étape",
};

/**
 * Tout ce qui touche à la correction d'une évaluation (notes, lettres, observations, résultats)
 * reste sur le portable : une fenêtre de projection n'y affiche qu'un message.
 */
export default async function AssessmentLayout({
  children,
  params,
}: LayoutProps<"/modules/[id]/assessments/[assessmentId]">) {
  const { id, assessmentId } = await params;
  const assessment = await getAssessment(assessmentId);
  return (
    <ProjectionGuard home="/dashboard">
      {assessment ? (
        <ObjectCrumbs
          items={[{ label: assessment.title }]}
          base={`/modules/${id}/assessments/${assessmentId}`}
          subPages={SUB_PAGES}
        />
      ) : null}
      {children}
    </ProjectionGuard>
  );
}
