import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { updateGrid } from "@/app/(app)/assessments/grids/actions";
import { GridForm } from "@/components/assessments/grid-form";
import { getGrid } from "@/lib/assessments/queries";

export const metadata: Metadata = { title: "Modifier la grille" };

export default async function EditGridPage({
  params,
}: PageProps<"/assessments/grids/[gridId]/edit">) {
  const { gridId } = await params;
  const grid = await getGrid(gridId);
  if (!grid) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Modifier « {grid.name} »</h1>
      <GridForm action={updateGrid.bind(null, gridId)} grid={grid} />
    </div>
  );
}
