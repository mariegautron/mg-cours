import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

import { saveGroupGrade, saveStudentGrade } from "@/app/(app)/modules/[id]/assessments/actions";
import { DeleteAssessmentButton } from "@/components/assessments/delete-buttons";
import { GradeForm } from "@/components/assessments/grade-form";
import { ResultsActions } from "@/components/assessments/results-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAssessment, getGradesByAssessment, listComments } from "@/lib/assessments/queries";

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

  const group = assessment.student_group;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{assessment.title}</h1>
          <p className="text-muted-foreground">
            {[assessment.subject, assessment.type, group?.name].filter(Boolean).join(" · ")}
            {assessment.date ? ` · ${new Date(assessment.date).toLocaleDateString("fr-FR")}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary">Coefficient {assessment.coefficient}</Badge>
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

      <ResultsActions
        moduleId={id}
        assessmentId={assessmentId}
        hasGrades={grades.some((g) => g.value !== null)}
      />

      {!group ? (
        <p className="text-muted-foreground">Groupe introuvable.</p>
      ) : assessment.is_group_grade ? (
        <GradeForm
          action={saveGroupGrade.bind(null, id, assessmentId, group.id)}
          title={`Note du groupe « ${group.name} »`}
          grid={assessment.grading_grid}
          grade={grades.find((g) => g.student_group_id === group.id)}
          comments={comments}
        />
      ) : group.members.length === 0 ? (
        <p className="text-muted-foreground">Ce groupe n’a aucun membre pour l’instant.</p>
      ) : (
        <div className="space-y-4">
          {group.members.map((m) => (
            <GradeForm
              key={m.id}
              action={saveStudentGrade.bind(null, id, assessmentId, m.id)}
              title={`${m.first_name} ${m.last_name}`}
              grid={assessment.grading_grid}
              grade={grades.find((g) => g.student_id === m.id)}
              comments={comments}
            />
          ))}
        </div>
      )}
    </div>
  );
}
