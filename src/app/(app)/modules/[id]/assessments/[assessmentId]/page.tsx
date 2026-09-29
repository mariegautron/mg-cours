import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, FileDown, Mic, Pencil, Presentation } from "lucide-react";

import {
  buildSessionSections,
  toObservationLines,
} from "@/app/(app)/modules/[id]/assessments/grading-sections";
import { DeleteAssessmentButton } from "@/components/assessments/delete-buttons";
import { GradingSession } from "@/components/assessments/grading-session";
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
import { assessmentFileUrl } from "@/lib/assessments/files";
import { isOralAssessment } from "@/lib/assessments/oral";
import {
  canPresent,
  evaluatedCriteria,
  PREP_STATUS_LABELS,
  subjectSections,
} from "@/lib/assessments/subject";
import { getModule, getModuleCourses } from "@/lib/modules/queries";
import { parseResourceFiles } from "@/lib/resources/files";
import { themeTitleByGroup } from "@/lib/projects/queries";
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
  const [assessment, grades, comments, mod, moduleObservations, courses] = await Promise.all([
    getAssessment(assessmentId),
    getGradesByAssessment(assessmentId),
    listComments(),
    getModule(id),
    listModuleObservations(id),
    getModuleCourses(id),
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
  const observations = toObservationLines(moduleObservations);
  const sections = buildSessionSections({
    moduleId: id,
    assessment,
    grades,
    overrideRows,
    observations,
    themes,
  });
  const groupNames = assessment.groups.map((g) => g.name).join(", ");
  const subjectParts = subjectSections(assessment);
  const criteria = evaluatedCriteria(assessment.grading_grid?.criteria ?? []);
  const files = parseResourceFiles(assessment.files);
  const courseIndex = courses.findIndex((c) => c.id === assessment.course_id);
  const course = courseIndex === -1 ? null : courses[courseIndex];
  const courseNumber = courseIndex + 1;

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
        <div className="flex flex-wrap gap-2">
          {isOralAssessment(assessment) ? (
            <Button asChild size="sm">
              <Link href={`/modules/${id}/assessments/${assessmentId}/oral`}>
                <Mic aria-hidden />
                Faire passer l’oral
              </Link>
            </Button>
          ) : null}
          <Button asChild variant="secondary" size="sm">
            <Link href={`/modules/${id}/assessments/${assessmentId}/edit`}>
              <Pencil aria-hidden />
              Modifier
            </Link>
          </Button>
          <DeleteAssessmentButton moduleId={id} assessmentId={assessmentId} />
        </div>
      </div>

      <section aria-labelledby="subject" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="subject" className="text-lg font-medium">
              Sujet
            </h2>
            <Badge variant={assessment.prep_status === "to_build" ? "outline" : "secondary"}>
              {PREP_STATUS_LABELS[assessment.prep_status]}
            </Badge>
            {course ? (
              <span className="text-muted-foreground text-sm">
                Séance {courseNumber} — {course.title}
              </span>
            ) : null}
          </div>
          {canPresent(assessment.prep_status) ? (
            <div className="flex flex-wrap gap-2">
              {assessment.grading_grid ? (
                <Button asChild size="sm" variant="secondary">
                  <a href={`/api/modules/${id}/assessments/${assessmentId}/grid`}>
                    <FileDown aria-hidden />
                    Grille pour les étudiant·es (PDF)
                  </a>
                </Button>
              ) : null}
              <Button asChild size="sm" variant="secondary">
                <Link href={`/present/modules/${id}/assessments/${assessmentId}`}>
                  <Presentation aria-hidden />
                  Présenter le sujet
                </Link>
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Le sujet se projette une fois « Prête » ou « Fournie ».
            </p>
          )}
        </div>

        {subjectParts.length === 0 && criteria.length === 0 && files.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Aucun sujet rédigé : ouvrez « Modifier » pour ajouter l’objectif, la consigne et le
            rendu attendu.
          </p>
        ) : null}

        {subjectParts.map((part) => (
          <div key={part.key}>
            <h3 className="mb-1 font-medium">{part.heading}</h3>
            {part.markdown ? <Markdown source={part.text} /> : <p>{part.text}</p>}
          </div>
        ))}

        {criteria.length > 0 ? (
          <div>
            <h3 className="mb-1 font-medium">
              Critères de la grille « {assessment.grading_grid?.name} »
            </h3>
            <ul className="list-disc space-y-1 pl-6 text-sm">
              {criteria.map((c) => (
                <li key={c.label}>
                  {c.label} — {c.points} pt{c.points > 1 ? "s" : ""}
                  {c.bonus ? " (bonus)" : ""}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {files.length > 0 ? (
          <div>
            <h3 className="mb-1 font-medium">Fichiers joints</h3>
            <ul className="space-y-1 text-sm">
              {files.map((f) => (
                <li key={f.path}>
                  <a
                    href={assessmentFileUrl(assessmentId, f.name)}
                    download
                    className="inline-flex items-center gap-1 underline underline-offset-2"
                  >
                    <Download aria-hidden className="size-4" />
                    {f.name}
                    <span className="sr-only"> (télécharger)</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

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
