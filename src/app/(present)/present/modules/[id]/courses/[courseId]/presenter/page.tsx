import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { addObservation } from "@/app/(app)/modules/[id]/courses/[courseId]/notebook/actions";
import { ObservationPanel } from "@/components/notebook/observation-panel";
import { notebookStudents } from "@/lib/notebook/notebook";
import { listModuleGroups } from "@/lib/students/queries";
import { listResources } from "@/lib/resources/queries";
import { buildCourseDeck } from "@/components/present/course-deck";
import { PresenterView } from "@/components/present/presenter-view";
import { loadCourseSubjects } from "@/lib/assessments/present-data";
import { getCourseResourcesFull, getModule, getModuleCourses } from "@/lib/modules/queries";
import { publicSlidesUrl } from "@/lib/modules/frise";
import { describeActivity, EMPTY_ACTIVITY, startTimes } from "@/lib/modules/activity";
import { getCourseActivities } from "@/lib/modules/activity-queries";
import { todayInParis } from "@/lib/modules/next-session";
import { parseHidden, resourceKey } from "@/lib/present/plan";
import { previousNextTime } from "@/lib/present/reprise";
import { syncChannelName } from "@/lib/present/sync";
import { KIND_LABELS, studentFacing } from "@/lib/resources/kind";

export const metadata: Metadata = { title: "Vue présentatrice" };

/**
 * Vue présentatrice d'une séance (US-64), ouverte dans une seconde fenêtre : mêmes diapositives
 * que la fenêtre projetée, plus les notes de séance et les ressources « Enseignante uniquement ».
 */
export default async function PresenterPage({
  params,
  searchParams,
}: PageProps<"/present/modules/[id]/courses/[courseId]/presenter">) {
  const { id, courseId } = await params;
  const hidden = parseHidden((await searchParams).hide);
  const [mod, courses, allResources, subjects, libraryRows, groups, activities] = await Promise.all(
    [
      getModule(id),
      getModuleCourses(id),
      getCourseResourcesFull(courseId),
      loadCourseSubjects(id, courseId),
      listResources(),
      listModuleGroups(id),
      getCourseActivities(courseId),
    ],
  );
  const position = courses.findIndex((c) => c.id === courseId);
  if (!mod || position === -1) notFound();
  const course = courses[position];

  const { sections, sectionKeys, slides } = buildCourseDeck({
    moduleName: mod.name,
    course,
    position,
    next: courses[position + 1],
    resources: studentFacing(allResources),
    resumeLines: previousNextTime(courses, position),
    subjects,
    hidden,
  });

  // Détails du déroulé (horaire, durée, type, objectif), alignés sur les sections du plan.
  const startsAt = startTimes(
    courses[position].start_time ? courses[position].start_time.slice(0, 5) : null,
    allResources.map((r) => activities.byResource.get(r.id) ?? EMPTY_ACTIVITY),
  );
  const metaByKey = new Map(
    allResources.map((r, i) => [
      resourceKey(r.id),
      describeActivity(activities.byResource.get(r.id) ?? EMPTY_ACTIVITY, startsAt[i]),
    ]),
  );
  const sectionMeta = sectionKeys.map((k) => metaByKey.get(k) ?? null);

  const notes = [
    { label: "Modalités d’animation", text: course.animation_notes },
    { label: "Modalités d’évaluation", text: course.assessment_notes },
    { label: "Matériel nécessaire", text: course.material },
  ].flatMap((n) => (n.text?.trim() ? [{ label: n.label, text: n.text.trim() }] : []));

  // Les ressources gardées « pour moi » (Avant de commencer) restent consultables ici, jamais projetées.
  const teacherResources = allResources
    .filter((r) => r.audience === "teacher" || hidden.has(resourceKey(r.id)))
    .map((r) => ({
      id: r.id,
      title: r.title,
      kindLabel: r.kind ? KIND_LABELS[r.kind] : null,
      toBuild: r.status !== "ready",
      content: r.content,
    }));

  const students = notebookStudents(groups).map(({ id, first_name, last_name, photo_path }) => ({
    id,
    first_name,
    last_name,
    photo_path,
  }));
  const today = course.session_date === todayInParis();

  return (
    <PresenterView
      title={`${mod.name} — Séance ${position + 1} : ${course.title}`}
      backHref={`/modules/${mod.id}/courses`}
      slides={slides}
      syncChannel={syncChannelName(courseId)}
      projectedHref={`/present/modules/${mod.id}/courses/${courseId}`}
      notes={notes}
      teacherResources={teacherResources}
      endTime={today ? course.end_time : null}
      sections={sections}
      sectionKeys={sectionKeys}
      sectionMeta={sectionMeta}
      slidesUrl={publicSlidesUrl(course.slides_url)}
      library={libraryRows.map((r) => ({
        id: r.id,
        title: r.title,
        kindLabel: r.kind ? KIND_LABELS[r.kind] : null,
        audience: r.audience,
        status: r.status,
      }))}
      moduleId={mod.id}
      courseId={courseId}
      sessionNotes={course.retro_note ?? ""}
      projectionName={`mg-projection-${courseId}`}
      startTime={today ? course.start_time : null}
      closeHref={`/modules/${mod.id}/courses/${courseId}/close`}
      trombiHref={`/modules/${mod.id}/courses/${courseId}/trombinoscope`}
      studentsPanel={
        <ObservationPanel
          action={addObservation.bind(null, mod.id, courseId)}
          students={students}
        />
      }
    />
  );
}
