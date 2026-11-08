import { moduleStudentAverages } from "@/lib/assessments/queries";
import { bonusLine, parseScale } from "@/lib/assessments/score-scale";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { QcmAnswersPanel } from "@/components/assessments/qcm-answers-panel";
import type { DrawnQuestion } from "@/lib/quiz/types";
import { createClient } from "@/lib/supabase/server";
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
import { getQuizByAssessment } from "@/lib/quiz/queries";
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
  // Note bonus : l'effet réel (enregistré) sur la moyenne de chaque personne, à côté du score.
  if (assessment.is_bonus) {
    const effectOf = new Map(
      (await moduleStudentAverages(id)).map((a) => [a.student.id, a.bonusEffect]),
    );
    for (const item of sections.flatMap((s) => s.items)) {
      item.bonusLine = bonusLine(effectOf.get(item.id) ?? null);
    }
  }
  const back = `/modules/${id}/assessments/${assessmentId}`;
  const quiz = assessment.is_group_grade ? null : await getQuizByAssessment(assessmentId);
  if (quiz) {
    // Réponses du QCM affichées dans la copie, en lecture seule (la relecture reste dans le suivi).
    const supabase = await createClient();
    const { data: attempts } = await supabase
      .from("quiz_attempt")
      .select("id, student_id, drawn, answers, manual_scores")
      .eq("quiz_id", quiz.id)
      .eq("status", "submitted");
    const byStudent = new Map((attempts ?? []).map((a) => [a.student_id, a]));
    for (const item of sections.flatMap((s) => s.items)) {
      const a = byStudent.get(item.id);
      if (!a) continue;
      item.qcm = (
        <QcmAnswersPanel
          name={item.title}
          drawn={a.drawn as unknown as DrawnQuestion[]}
          answers={(a.answers ?? {}) as Record<string, unknown>}
          manual={(a.manual_scores ?? {}) as Record<string, unknown>}
          reviewHref={`${back}/quiz/attempts/${a.id}`}
        />
      );
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="text-2xl font-semibold">Corriger : {assessment.title}</h1>
        <p className="text-muted-foreground text-sm">
          Tout s’enregistre au fur et à mesure.{" "}
          {assessment.is_group_grade ? "Note de groupe." : "Note individuelle."} Sur{" "}
          {assessment.maxScore}.
        </p>
      </div>
      {quiz ? (
        <p className="bg-muted/50 rounded-2xl border p-3 text-sm">
          Cette évaluation a un QCM en ligne : les réponses de chaque étudiant·e se relisent,
          question par question, dans le suivi du QCM.{" "}
          <Link
            href={`${back}/quiz/links#follow`}
            className="font-semibold underline underline-offset-2"
          >
            Relire les copies du QCM
          </Link>
        </p>
      ) : null}
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
          bonusScale={assessment.is_bonus ? parseScale(assessment.score_scale) : null}
          initialId={typeof copy === "string" ? copy : undefined}
          overviewHref={back}
        />
      )}
    </div>
  );
}
