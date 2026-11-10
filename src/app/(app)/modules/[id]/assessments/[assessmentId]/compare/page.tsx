import { redirect } from "next/navigation";

/**
 * Ancienne page « Comparer un critère » (retirée : doublon D2). Les liens déjà donnés mènent à la
 * vue « Par critère » de la correction, qui garde le tri et « Vérifier mes écarts ».
 */
export default async function CompareCriterionPage({
  params,
}: PageProps<"/modules/[id]/assessments/[assessmentId]/compare">) {
  const { id, assessmentId } = await params;
  redirect(`/modules/${id}/assessments/${assessmentId}/correct?vue=critere`);
}
