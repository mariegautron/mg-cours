import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StudentResult } from "@/components/results/student-result";
import { Button } from "@/components/ui/button";
import { getAssessment } from "@/lib/assessments/queries";
import { loadResultSheets } from "@/lib/assessments/results-data";
import { publicSheetFor } from "@/lib/result-links/sheet";

export const metadata: Metadata = { title: "Voir comme l’étudiant·e" };

/**
 * Aperçu avant envoi : exactement ce que la personne recevra (même composant, même fiche que celle
 * publiée : vouvoiement, jamais le carnet ni les notes privées). Rien n'est publié ni envoyé ici.
 */
export default async function ResultsPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; assessmentId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id, assessmentId } = await params;
  const { student } = await searchParams;
  const [assessment, sheets] = await Promise.all([
    getAssessment(assessmentId),
    loadResultSheets(id, assessmentId),
  ]);
  if (!assessment || assessment.module_id !== id || !sheets) notFound();

  const back = `/modules/${id}/assessments/${assessmentId}/results`;
  const studentId = typeof student === "string" ? student : null;
  const sheet = studentId
    ? sheets
        .map((s) => publicSheetFor(s, studentId))
        .find((s): s is NonNullable<typeof s> => s !== null)
    : null;
  if (!sheet) notFound();

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div
        role="note"
        className="bg-sun/10 border-sun/50 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-sm"
      >
        <p>
          <strong>Aperçu.</strong> Voilà ce que {sheet.recipients[0].name} verra. Rien n’est envoyé
          depuis cette page.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href={back}>← Retour à l’envoi des résultats</Link>
        </Button>
      </div>
      <StudentResult sheet={sheet} token={null} />
    </div>
  );
}
