import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { updateAssessment } from "@/app/(app)/modules/[id]/assessments/actions";
import { AssessmentForm } from "@/components/assessments/assessment-form";
import { AssessmentFiles } from "@/components/assessments/assessment-files";
import { getAssessment, listGrids } from "@/lib/assessments/queries";
import { getModuleCourses } from "@/lib/modules/queries";
import { parseResourceFiles } from "@/lib/resources/files";
import { listModuleGroups } from "@/lib/students/queries";

export const metadata: Metadata = { title: "Modifier l’évaluation" };

export default async function EditAssessmentPage({
  params,
}: PageProps<"/modules/[id]/assessments/[assessmentId]/edit">) {
  const { id, assessmentId } = await params;
  const [assessment, groups, grids, courses] = await Promise.all([
    getAssessment(assessmentId),
    listModuleGroups(id),
    listGrids(),
    getModuleCourses(id),
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
        courses={courses}
        assessment={assessment}
      />
      <section aria-labelledby="files-heading" className="max-w-xl space-y-3">
        <h2 id="files-heading" className="text-lg font-medium">
          Fichiers joints au sujet
        </h2>
        <p className="text-muted-foreground text-sm">
          Téléchargés par les étudiant·es (extrait de code, questions…), jamais affichés ni
          projetés.
        </p>
        <AssessmentFiles assessmentId={assessmentId} files={parseResourceFiles(assessment.files)} />
      </section>
    </div>
  );
}
