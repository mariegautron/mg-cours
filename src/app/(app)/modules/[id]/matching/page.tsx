import { redirect } from "next/navigation";

/**
 * Ancienne page « Rapprocher les ressources » (doublons D27, D28) : la couverture des attendus est
 * dans la page Attendus, et une ressource se place dans le déroulé d'une séance.
 */
export default async function MatchingPage({ params }: PageProps<"/modules/[id]/matching">) {
  const { id } = await params;
  redirect(`/modules/${id}/expectations#couverture`);
}
