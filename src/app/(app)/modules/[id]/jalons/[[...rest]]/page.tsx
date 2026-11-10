import { redirect } from "next/navigation";

/**
 * Anciennes adresses des « Jalons » (page retirée avec les tables `checkpoint`, doublon D15) : les
 * points d'étape (notés ou non) sont dans les évaluations du module.
 */
export default async function JalonsRedirect({
  params,
}: {
  params: Promise<{ id: string; rest?: string[] }>;
}) {
  const { id } = await params;
  redirect(`/modules/${id}/assessments`);
}
