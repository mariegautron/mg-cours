import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PrepPanel } from "@/components/present/prep-panel";
import { Button } from "@/components/ui/button";
import { listModuleAssessments } from "@/lib/assessments/queries";
import { loadCourseSubjects } from "@/lib/assessments/present-data";
import { canPresent } from "@/lib/assessments/subject";
import { publicSlidesUrl } from "@/lib/modules/frise";
import { checkDuration, EMPTY_ACTIVITY, totalMinutes } from "@/lib/modules/activity";
import { getCourseActivities } from "@/lib/modules/activity-queries";
import { minutesBetween } from "@/lib/modules/workspace";
import { getCourseResourcesFull, getModule, getModuleCourses } from "@/lib/modules/queries";
import { countCourseQcm } from "@/lib/present/qcm-data";
import { prepItems } from "@/lib/present/items";
import { studentFacing } from "@/lib/resources/kind";
import { previousNextTime } from "@/lib/present/reprise";

export const metadata: Metadata = { title: "Avant de commencer" };

/** « Avant de commencer » (maquette Affichage) : le déroulé, l'appel et les deux fenêtres. */
export default async function StartCoursePage({
  params,
}: PageProps<"/modules/[id]/courses/[courseId]/start">) {
  const { id, courseId } = await params;
  const [mod, courses, resources, subjects, assessments, activities] = await Promise.all([
    getModule(id),
    getModuleCourses(id),
    getCourseResourcesFull(courseId),
    loadCourseSubjects(id, courseId),
    listModuleAssessments(id),
    getCourseActivities(courseId),
  ]);
  const position = courses.findIndex((c) => c.id === courseId);
  if (!mod || position === -1) notFound();
  const course = courses[position];

  const qcmCounts = await countCourseQcm(
    studentFacing(resources).map((r) => ({ id: r.id, title: r.title })),
  );
  const items = prepItems({
    hasResume: previousNextTime(courses, position).length > 0,
    objectives: course.learning_objectives.length,
    resources: resources.map((r) => ({
      id: r.id,
      title: r.title,
      audience: r.audience,
      status: r.status,
      linkOnly: !!r.url && !(r.content ?? "").trim(),
    })),
    subjects: subjects.map((s) => ({
      title: s.title,
      hasCadre: !!s.cadre,
      hasGrid: !!s.grid,
    })),
    qcm: studentFacing(resources)
      .filter((r) => qcmCounts.has(r.id))
      .map((r) => ({ resourceId: r.id, title: r.title, count: qcmCounts.get(r.id)! })),
    unpreparedSubjects: assessments
      .filter((a) => a.course_id === courseId && !a.makeup_of_id && !canPresent(a.prep_status))
      .map((a) => a.title),
  });

  const when = course.session_date
    ? new Date(`${course.session_date}T12:00:00`).toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : null;

  return (
    <div className="mx-auto max-w-[112rem] space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-primary mb-1.5 text-xs font-bold tracking-widest uppercase">
            Séance {position + 1}
            {when ? ` · ${when}` : ""}
          </p>
          <h1 className="font-heading text-3xl font-bold tracking-tight">Avant de commencer</h1>
          <p className="text-muted-foreground mt-1">
            {course.title} · le cours se projette depuis l’app, découpé automatiquement. Le nombre
            de diapositives n’a pas d’importance.
          </p>
        </div>
        <Button asChild variant="ghost">
          <Link href={`/modules/${id}/courses/${courseId}`}>← Retour à la séance</Link>
        </Button>
      </div>
      {activities.available && resources.length > 0 ? (
        <p role="status" className="text-sm font-medium">
          {
            checkDuration(
              totalMinutes(resources.map((r) => activities.byResource.get(r.id) ?? EMPTY_ACTIVITY)),
              minutesBetween(course.start_time, course.end_time),
            ).message
          }
        </p>
      ) : null}
      {publicSlidesUrl(course.slides_url) ? (
        <p>
          <Button asChild variant="outline" size="touch">
            <a href={publicSlidesUrl(course.slides_url)!} target="_blank" rel="noopener noreferrer">
              Ouvrir les slides de la séance<span className="sr-only"> (nouvel onglet)</span>
            </a>
          </Button>
        </p>
      ) : null}
      <PrepPanel
        moduleId={id}
        courseId={courseId}
        items={items}
        seanceLabel={`séance ${position + 1}, ${course.title}`}
      />
    </div>
  );
}
