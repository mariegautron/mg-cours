import { redirect } from "next/navigation";

/** Ancienne page « Phrases » d'une évaluation (doublon D8) : une seule page « Phrases », dans la Bibliothèque. */
export default async function AssessmentPhrasesPage() {
  redirect("/assessments/comments");
}
