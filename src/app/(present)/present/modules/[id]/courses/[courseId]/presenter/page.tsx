import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { buildCourseDeck } from "@/components/present/course-deck";
import { PresenterView } from "@/components/present/presenter-view";
import { loadCourseSubjects } from "@/lib/assessments/present-data";
import { getCourseResourcesFull, getModule, getModuleCourses } from "@/lib/modules/queries";
import { todayInParis } from "@/lib/modules/next-session";
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
}: PageProps<"/present/modules/[id]/courses/[courseId]/presenter">) {
  const { id, courseId } = await params;
  const [mod, courses, allResources, subjects] = await Promise.all([
    getModule(id),
    getModuleCourses(id),
    getCourseResourcesFull(courseId),
    loadCourseSubjects(id, courseId),
  ]);
  const position = courses.findIndex((c) => c.id === courseId);
  if (!mod || position === -1) notFound();
  const course = courses[position];

  const { slides } = buildCourseDeck({
    moduleName: mod.name,
    course,
    position,
    next: courses[position + 1],
    resources: studentFacing(allResources),
    resumeLines: previousNextTime(courses, position),
    subjects,
  });

  const notes = [
    { label: "Modalités d’animation", text: course.animation_notes },
    { label: "Modalités d’évaluation", text: course.assessment_notes },
    { label: "Matériel nécessaire", text: course.material },
  ].flatMap((n) => (n.text?.trim() ? [{ label: n.label, text: n.text.trim() }] : []));

  const teacherResources = allResources
    .filter((r) => r.audience === "teacher")
    .map((r) => ({
      id: r.id,
      title: r.title,
      kindLabel: r.kind ? KIND_LABELS[r.kind] : null,
      toBuild: r.status !== "ready",
    }));

  return (
    <PresenterView
      title={`${mod.name} — Séance ${position + 1} : ${course.title}`}
      backHref={`/modules/${mod.id}#courses`}
      slides={slides}
      syncChannel={syncChannelName(courseId)}
      projectedHref={`/present/modules/${mod.id}/courses/${courseId}`}
      notes={notes}
      teacherResources={teacherResources}
      endTime={course.session_date === todayInParis() ? course.end_time : null}
    />
  );
}
