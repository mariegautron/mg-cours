import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { createAssessment } from "@/app/(app)/modules/[id]/assessments/actions";
import { AssessmentForm } from "@/components/assessments/assessment-form";
import { listGrids } from "@/lib/assessments/queries";
import { getModule, getModuleCourses } from "@/lib/modules/queries";
import { listModuleGroups } from "@/lib/students/queries";

export const metadata: Metadata = { title: "Nouvelle évaluation" };

export default async function NewAssessmentPage({
  params,
  searchParams,
}: PageProps<"/modules/[id]/assessments/new">) {
  const { id } = await params;
  const { grille } = await searchParams;
  const [mod, groups, grids, courses] = await Promise.all([
    getModule(id),
    listModuleGroups(id),
    listGrids(),
    getModuleCourses(id),
  ]);
  if (!mod) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Nouvelle évaluation — {mod.name}</h1>
      {groups.length === 0 ? (
        <p role="status" className="text-muted-foreground">
          Aucun groupe pour l’instant : l’évaluation sera rattachée à un groupe « Toute la promotion
          », où tu ajouteras les étudiant·es ensuite.
        </p>
      ) : null}
      <AssessmentForm
        action={createAssessment.bind(null, id)}
        moduleId={id}
        groups={groups}
        grids={grids}
        courses={courses}
        initialGridId={
          typeof grille === "string" && grids.some((g) => g.id === grille) ? grille : ""
        }
      />
    </div>
  );
}
