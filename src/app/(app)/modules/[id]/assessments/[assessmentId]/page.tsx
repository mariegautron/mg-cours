import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

import { saveGroupGrade, saveStudentGrade } from "@/app/(app)/modules/[id]/assessments/actions";
import { DeleteAssessmentButton } from "@/components/assessments/delete-buttons";
import { GradingSession, type SessionSection } from "@/components/assessments/grading-session";
import { Markdown } from "@/components/markdown";
import { ResultsActions } from "@/components/assessments/results-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getAssessment,
  getGradesByAssessment,
  listComments,
  listGroupGradeMembers,
} from "@/lib/assessments/queries";
import { loadResultSheets } from "@/lib/assessments/results-data";
import { resultsRecipients } from "@/lib/assessments/results";
import { gradingTargets } from "@/lib/assessments/targets";
import { observationsForCopy, type ObservationLine } from "@/lib/assessments/session";
import { getModule } from "@/lib/modules/queries";
import { themeTitleByGroup } from "@/lib/projects/queries";
import { OBSERVATION_TAG_LABELS } from "@/lib/notebook/notebook";
import { listModuleObservations } from "@/lib/notebook/queries";

export async function generateMetadata({
  params,
}: PageProps<"/modules/[id]/assessments/[assessmentId]">): Promise<Metadata> {
  const { assessmentId } = await params;
  const assessment = await getAssessment(assessmentId);
  return { title: assessment?.title ?? "Évaluation" };
}

export default async function AssessmentPage({
  params,
}: PageProps<"/modules/[id]/assessments/[assessmentId]">) {
  const { id, assessmentId } = await params;
  const [assessment, grades, comments, mod, moduleObservations] = await Promise.all([
    getAssessment(assessmentId),
    getGradesByAssessment(assessmentId),
    listComments(),
    getModule(id),
    listModuleObservations(id),
  ]);
  if (!assessment || assessment.module_id !== id) notFound();

  const overrideRows = await listGroupGradeMembers(
    grades.filter((g) => g.student_group_id).map((g) => g.id),
  );
  const themes = await themeTitleByGroup(assessment.project_id);
  const targets = gradingTargets(assessment.is_group_grade, assessment.groups);
  const hasGrades = grades.some((g) => g.value !== null);
  const recipients = hasGrades
    ? resultsRecipients((await loadResultSheets(id, assessmentId)) ?? [])
    : { emails: 0, withoutEmail: [] };
  // Observations de cours (carnet) : consultables pendant la correction, jamais exportées.
  const observations: ObservationLine[] = moduleObservations.map((o) => ({
    id: o.id,
    studentId: o.student_id,
    studentName: o.student ? `${o.student.first_name} ${o.student.last_name}` : "",
    tag: OBSERVATION_TAG_LABELS[o.tag] ?? o.tag,
    note: o.note,
    createdAt: o.created_at,
  }));
  const sections: SessionSection[] = assessment.is_group_grade
    ? [
        {
          id: "groups",
          title: null,
          items: targets.map(({ group }) => ({
            id: group.id,
            title: `Note du groupe « ${group.name} »`,
            action: saveGroupGrade.bind(null, id, assessmentId, group.id),
            theme: themes[group.id] ?? null,
            grade: grades.find((g) => g.student_group_id === group.id),
            observations: observationsForCopy(
              group.members.map((m) => m.id),
              observations,
            ),
            members: group.members.map((m) => ({
              id: m.id,
              name: `${m.first_name} ${m.last_name}`,
            })),
            memberOverrides: Object.fromEntries(
              overrideRows
                .filter(
                  (o) => o.grade_id === grades.find((g) => g.student_group_id === group.id)?.id,
                )
                .map((o) => [
                  o.student_id,
                  {
                    attendance: o.attendance,
                    factor: o.individual_factor,
                    justification: o.justification,
                  },
                ]),
            ),
          })),
        },
      ]
    : targets.map(({ group, students }) => ({
        id: group.id,
        title: group.name,
        empty:
          group.members.length === 0
            ? "Ce groupe n’a aucun membre pour l’instant."
            : "Membres déjà notés dans un autre groupe ci-dessus.",
        items: students.map((m) => ({
          id: m.id,
          title: `${m.first_name} ${m.last_name}`,
          action: saveStudentGrade.bind(null, id, assessmentId, m.id),
          theme: themes[group.id] ?? null,
          grade: grades.find((g) => g.student_id === m.id),
          observations: observationsForCopy([m.id], observations),
        })),
      }));
  const groupNames = assessment.groups.map((g) => g.name).join(", ");

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{assessment.title}</h1>
          <p className="text-muted-foreground">
            {[assessment.type, groupNames].filter(Boolean).join(" · ")}
            {assessment.date ? ` · ${new Date(assessment.date).toLocaleDateString("fr-FR")}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary">Coefficient {assessment.coefficient}</Badge>
            <Badge variant="outline">Sur {assessment.maxScore}</Badge>
            <Badge variant="outline">
              {assessment.is_group_grade ? "Note de groupe" : "Note individuelle"}
            </Badge>
            {assessment.grading_grid ? (
              <Badge variant="outline">{assessment.grading_grid.name}</Badge>
            ) : null}
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link href={`/modules/${id}/assessments/${assessmentId}/edit`}>
              <Pencil aria-hidden />
              Modifier
            </Link>
          </Button>
          <DeleteAssessmentButton moduleId={id} assessmentId={assessmentId} />
        </div>
      </div>

      {assessment.subject ? (
        <section aria-labelledby="subject">
          <h2 id="subject" className="mb-2 text-lg font-medium">
            Sujet
          </h2>
          <Markdown source={assessment.subject} />
        </section>
      ) : null}

      <ResultsActions
        moduleId={id}
        assessmentId={assessmentId}
        hasGrades={hasGrades}
        recipients={recipients}
        sentAt={assessment.results_sent_at}
      />

      {targets.length === 0 ? (
        <p className="text-muted-foreground">Aucun groupe visé : modifiez l’évaluation.</p>
      ) : (
        <GradingSession
          sections={sections}
          grid={assessment.grading_grid}
          maxScore={assessment.maxScore}
          comments={comments}
          autoValidatedIds={assessment.auto_validated_criterion_ids}
          subject={mod?.name ?? null}
        />
      )}
    </div>
  );
}
