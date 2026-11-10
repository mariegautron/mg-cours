import { redirect } from "next/navigation";

/** Ancien écran « Nouveau groupe » (doublon D32) : c'est maintenant un bloc de l'assistant de groupes. */
export default async function NewGroupPage({ params }: PageProps<"/modules/[id]/groups/new">) {
  const { id } = await params;
  redirect(`/modules/${id}/groups/wizard#nouveau`);
}
