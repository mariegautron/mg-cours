import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

import { saveGroupGrade, saveStudentGrade } from "@/app/(app)/modules/[id]/assessments/actions";
import { DeleteAssessmentButton } from "@/components/assessments/delete-buttons";
import { GradeForm } from "@/components/assessments/grade-form";
import { Markdown } from "@/components/markdown";
import { ResultsActions } from "@/components/assessments/results-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAssessment, getGradesByAssessment, listComments } from "@/lib/assessments/queries";
import { loadResultSheets } from "@/lib/assessments/results-data";
import { resultsRecipients } from "@/lib/assessments/results";
import { gradingTargets } from "@/lib/assessments/targets";

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
  const [assessment, grades, comments] = await Promise.all([
    getAssessment(assessmentId),
    getGradesByAssessment(assessmentId),
    listComments(),
  ]);
  if (!assessment || assessment.module_id !== id) notFound();

  const targets = gradingTargets(assessment.is_group_grade, assessment.groups);
  const hasGrades = grades.some((g) => g.value !== null);
  const recipients = hasGrades
    ? resultsRecipients((await loadResultSheets(id, assessmentId)) ?? [])
    : { emails: 0, withoutEmail: [] };
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
      ) : assessment.is_group_grade ? (
        <div className="space-y-4">
          {targets.map(({ group }) => (
            <GradeForm
              key={group.id}
              action={saveGroupGrade.bind(null, id, assessmentId, group.id)}
              title={`Note du groupe « ${group.name} »`}
              grid={assessment.grading_grid}
              maxScore={assessment.maxScore}
              grade={grades.find((g) => g.student_group_id === group.id)}
              comments={comments}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {targets.map(({ group, students }) => (
            <section key={group.id} aria-labelledby={`group-${group.id}`} className="space-y-4">
              <h2 id={`group-${group.id}`} className="text-lg font-semibold">
                {group.name}
              </h2>
              {students.length === 0 ? (
                <p className="text-muted-foreground">
                  {group.members.length === 0
                    ? "Ce groupe n’a aucun membre pour l’instant."
                    : "Membres déjà notés dans un autre groupe ci-dessus."}
                </p>
              ) : (
                students.map((m) => (
                  <GradeForm
                    key={m.id}
                    action={saveStudentGrade.bind(null, id, assessmentId, m.id)}
                    title={`${m.first_name} ${m.last_name}`}
                    grid={assessment.grading_grid}
                    maxScore={assessment.maxScore}
                    grade={grades.find((g) => g.student_id === m.id)}
                    comments={comments}
                  />
                ))
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
