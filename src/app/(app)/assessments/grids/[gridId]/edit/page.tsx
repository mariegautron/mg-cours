import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { updateGrid } from "@/app/(app)/assessments/grids/actions";
import { GridForm } from "@/components/assessments/grid-form";
import { createClient } from "@/lib/supabase/server";
import { getGrid } from "@/lib/assessments/queries";

export const metadata: Metadata = { title: "Modifier la grille" };

export default async function EditGridPage({
  params,
}: PageProps<"/assessments/grids/[gridId]/edit">) {
  const { gridId } = await params;
  const grid = await getGrid(gridId);
  if (!grid) notFound();

  const supabase = await createClient();
  const { data: using } = await supabase
    .from("assessment")
    .select("id")
    .eq("grading_grid_id", gridId);
  const ids = (using ?? []).map((u) => u.id);
  const { data: graded } = ids.length
    ? await supabase.from("grade").select("assessment_id").in("assessment_id", ids)
    : { data: [] };
  const usage = {
    assessments: ids.length,
    graded: new Set((graded ?? []).map((g) => g.assessment_id)).size,
  };

  return (
    <div className="space-y-6">
      <h1>Modifier « {grid.name} »</h1>
      <GridForm action={updateGrid.bind(null, gridId)} grid={grid} usage={usage} />
    </div>
  );
}
