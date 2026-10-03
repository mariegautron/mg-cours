import { redirect } from "next/navigation";

/** « Construire les séances » est devenu l'écran Séances (liste + séance ouverte). */
export default async function BuildRedirect({ params }: PageProps<"/modules/[id]/build">) {
  const { id } = await params;
  redirect(`/modules/${id}/courses`);
}
