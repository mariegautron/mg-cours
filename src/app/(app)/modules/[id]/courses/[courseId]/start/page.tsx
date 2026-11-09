import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PreviousRecap } from "@/components/present/previous-recap";
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
import { listModuleGroups } from "@/lib/students/queries";

export const metadata: Metadata = { title: "Avant de commencer" };

/** « Avant de commencer » (maquette Affichage) : le déroulé, l'appel et les deux fenêtres. */
export default async function StartCoursePage({
  params,
}: PageProps<"/modules/[id]/courses/[courseId]/start">) {
  const { id, courseId } = await params;
  const [mod, courses, resources, subjects, assessments, activities, groups] = await Promise.all([
    getModule(id),
    getModuleCourses(id),
    getCourseResourcesFull(courseId),
    loadCourseSubjects(id, courseId),
    listModuleAssessments(id),
    getCourseActivities(courseId),
    listModuleGroups(id),
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

  // Classe pas encore en place : personne dans les groupes, ou pas de groupes alors qu'une
  // évaluation se note en groupe.
  const peopleCount = new Set(groups.flatMap((g) => g.members.map((m) => m.id))).size;
  const classMissing =
    peopleCount === 0 ||
    (groups.length === 0 && assessments.some((a) => a.is_group_grade && !a.makeup_of_id));

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
      {classMissing ? (
        <section
          aria-labelledby="class-missing"
          className="border-sun/60 bg-sun/10 space-y-2 rounded-xl border p-4"
        >
          <h2 id="class-missing" className="font-heading text-lg font-bold">
            Ta classe n’est pas encore en place
          </h2>
          <p className="text-sm">
            {peopleCount === 0
              ? "Aucun·e étudiant·e dans ce module pour l’instant."
              : "Pas encore de groupes dans ce module."}{" "}
            Les deux pages s’ouvrent dans un nouvel onglet : tu ne perds pas le lancement du cours.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="touch">
              <a href={`/modules/${id}/groups/import`} target="_blank" rel="noopener noreferrer">
                Importer la liste<span className="sr-only"> (nouvel onglet)</span>
              </a>
            </Button>
            <Button asChild variant="outline" size="touch">
              <a href={`/modules/${id}/groups/wizard`} target="_blank" rel="noopener noreferrer">
                Faire les groupes<span className="sr-only"> (nouvel onglet)</span>
              </a>
            </Button>
          </div>
        </section>
      ) : null}
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
              Slides d’origine de la séance<span className="sr-only"> (nouvel onglet)</span>
            </a>
          </Button>
        </p>
      ) : null}
      {position > 0 ? (
        <PreviousRecap
          nextTime={courses[position - 1].next_time}
          notCovered={courses[position - 1].not_covered}
        />
      ) : null}
      <PrepPanel
        moduleId={id}
        courseId={courseId}
        items={items}
        storedHidden={course.hidden_keys ?? null}
        seanceLabel={`séance ${position + 1}, ${course.title}`}
      />
    </div>
  );
}
