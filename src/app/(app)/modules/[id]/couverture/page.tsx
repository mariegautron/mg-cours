import { redirect } from "next/navigation";

/** Ancienne page « Couverture » (doublon D27) : fusionnée dans la page Attendus. */
export default async function CoveragePage({ params }: PageProps<"/modules/[id]/couverture">) {
  const { id } = await params;
  redirect(`/modules/${id}/expectations#couverture`);
}
