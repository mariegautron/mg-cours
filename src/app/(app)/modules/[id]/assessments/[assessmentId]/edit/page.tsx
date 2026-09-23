import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { updateAssessment } from "@/app/(app)/modules/[id]/assessments/actions";
import { AssessmentForm } from "@/components/assessments/assessment-form";
import { getAssessment, listGrids } from "@/lib/assessments/queries";
import { listModuleGroups } from "@/lib/students/queries";

export const metadata: Metadata = { title: "Modifier l’évaluation" };

export default async function EditAssessmentPage({
  params,
}: PageProps<"/modules/[id]/assessments/[assessmentId]/edit">) {
  const { id, assessmentId } = await params;
  const [assessment, groups, grids] = await Promise.all([
    getAssessment(assessmentId),
    listModuleGroups(id),
    listGrids(),
  ]);
  if (!assessment || assessment.module_id !== id) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Modifier « {assessment.title} »</h1>
      <AssessmentForm
        action={updateAssessment.bind(null, id, assessmentId)}
        moduleId={id}
        groups={groups}
        grids={grids}
        assessment={assessment}
      />
    </div>
  );
}
