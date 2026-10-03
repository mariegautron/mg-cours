import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GradingSession } from "@/components/assessments/grading-session";
import {
  buildSessionSections,
  toObservationLines,
} from "@/app/(app)/modules/[id]/assessments/grading-sections";
import {
  getAssessment,
  getGradesByAssessment,
  listComments,
  listGroupGradeMembers,
} from "@/lib/assessments/queries";
import { getModule } from "@/lib/modules/queries";
import { listModuleObservations } from "@/lib/notebook/queries";
import { groupByOwner } from "@/lib/projects/submission-items";
import { listSubmissionItems } from "@/lib/projects/submission-queries";
import { themeTitleByGroup } from "@/lib/projects/queries";
import { getAbsenceRuleForModule } from "@/lib/settings/rules-queries";

export const metadata: Metadata = { title: "Corriger" };

/**
 * Correction plein écran d'une évaluation : une copie à la fois (ou tous les critères d'un coup),
 * navigation d'une copie à l'autre, enregistrement automatique. `?copy=` ouvre une copie précise.
 */
export default async function CorrectPage({
  params,
  searchParams,
}: PageProps<"/modules/[id]/assessments/[assessmentId]/correct">) {
  const { id, assessmentId } = await params;
  const { copy } = await searchParams;
  const [assessment, grades, comments, mod, moduleObservations, absenceRule] = await Promise.all([
    getAssessment(assessmentId),
    getGradesByAssessment(assessmentId),
    listComments(),
    getModule(id),
    listModuleObservations(id),
    getAbsenceRuleForModule(id),
  ]);
  if (!assessment || assessment.module_id !== id) notFound();

  const [overrideRows, themes, submissionData] = await Promise.all([
    listGroupGradeMembers(grades.filter((g) => g.student_group_id).map((g) => g.id)),
    themeTitleByGroup(assessment.project_id),
    listSubmissionItems(assessmentId),
  ]);
  const sections = buildSessionSections({
    moduleId: id,
    assessment,
    grades,
    overrideRows,
    observations: toObservationLines(moduleObservations),
    themes,
    submissions: submissionData.available ? groupByOwner(submissionData.items) : undefined,
  });
  const back = `/modules/${id}/assessments/${assessmentId}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-primary text-xs font-bold tracking-widest uppercase">Évaluations</p>
          <h1 className="text-3xl font-semibold">Corriger : {assessment.title}</h1>
          <p className="text-muted-foreground">
            Tout s’enregistre au fur et à mesure.{" "}
            {assessment.is_group_grade ? "Note de groupe." : "Note individuelle."} Sur{" "}
            {assessment.maxScore}.
          </p>
        </div>
      </div>
      {sections.flatMap((s) => s.items).length === 0 ? (
        <p className="text-muted-foreground">Aucun groupe visé : modifie l’évaluation.</p>
      ) : (
        <GradingSession
          sections={sections}
          grid={assessment.grading_grid}
          maxScore={assessment.maxScore}
          comments={comments}
          autoValidatedIds={assessment.auto_validated_criterion_ids}
          subject={mod?.name ?? null}
          absenceRule={absenceRule}
          initialId={typeof copy === "string" ? copy : undefined}
          overviewHref={back}
        />
      )}
    </div>
  );
}
