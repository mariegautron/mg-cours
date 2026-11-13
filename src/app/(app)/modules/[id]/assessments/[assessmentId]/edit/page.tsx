import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { updateAssessment } from "@/app/(app)/modules/[id]/assessments/actions";
import { AssessmentForm } from "@/components/assessments/assessment-form";
import { AssessmentFiles } from "@/components/assessments/assessment-files";
import { getAssessment, listGrids } from "@/lib/assessments/queries";
import { getSchoolRulesForModule } from "@/lib/settings/rules-queries";
import { listReviewTargets } from "@/lib/assessments/review-targets";
import { getModuleProject } from "@/lib/projects/queries";
import { getModuleCourses } from "@/lib/modules/queries";
import { parseResourceFiles } from "@/lib/resources/files";
import { listModuleGroups } from "@/lib/students/queries";

async function schoolCoefficients(moduleId: string) {
  const { grading } = await getSchoolRulesForModule(moduleId);
  return { group: grading.groupCoefficient, individual: grading.individualCoefficient };
}

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
      <h1 className="text-xl">Modifier « {assessment.title} »</h1>
      {assessment.needs_review ? (
        <p
          role="status"
          className="border-status-todo bg-muted max-w-xl rounded-xl border p-3 text-sm"
        >
          <strong>Reprise : à relire.</strong> Cette évaluation vient d’un autre module : son sujet
          et « Ce qui est évalué » en parlent peut-être encore, et partiraient tels quels dans la
          progression. Relis-les puis clique sur « Enregistrer ».
        </p>
      ) : null}
      <AssessmentForm
        action={updateAssessment.bind(null, id, assessmentId)}
        moduleId={id}
        groups={groups}
        grids={grids}
        courses={courses}
        coefficients={await schoolCoefficients(id)}
        reviewTargets={await listReviewTargets(id, assessmentId)}
        hasProject={!!(await getModuleProject(id))}
        assessment={assessment}
      >
        <section aria-labelledby="files-heading" className="max-w-xl space-y-3">
          <h2 id="files-heading" className="text-sm font-semibold">
            Fichiers joints au sujet
          </h2>
          <p className="text-muted-foreground text-sm">
            Téléchargés par les étudiant·es (extrait de code, questions…), jamais affichés ni
            projetés.
          </p>
          <AssessmentFiles
            assessmentId={assessmentId}
            files={parseResourceFiles(assessment.files)}
          />
        </section>
      </AssessmentForm>
    </div>
  );
}
