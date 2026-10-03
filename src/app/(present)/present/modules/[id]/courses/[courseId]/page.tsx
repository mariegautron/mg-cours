import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { buildCourseDeck } from "@/components/present/course-deck";
import { PresentShell } from "@/components/present/present-shell";
import { loadCourseSubjects } from "@/lib/assessments/present-data";
import { getCourseResourcesFull, getModule, getModuleCourses } from "@/lib/modules/queries";
import { parseHidden } from "@/lib/present/plan";
import { previousNextTime } from "@/lib/present/reprise";
import { syncChannelName } from "@/lib/present/sync";
import { studentFacing } from "@/lib/resources/kind";

export async function generateMetadata({
  params,
}: PageProps<"/present/modules/[id]/courses/[courseId]">): Promise<Metadata> {
  const { id, courseId } = await params;
  const courses = await getModuleCourses(id);
  const course = courses.find((c) => c.id === courseId);
  return { title: course ? `Faire cours — ${course.title}` : "Faire cours" };
}

/** Déroulé projeté d'une séance : titre → objectifs → ressources étudiant·es → suite. */
export default async function PresentCoursePage({
  params,
  searchParams,
}: PageProps<"/present/modules/[id]/courses/[courseId]">) {
  const { id, courseId } = await params;
  const hidden = parseHidden((await searchParams).hide);
  const [mod, courses, allResources, subjects] = await Promise.all([
    getModule(id),
    getModuleCourses(id),
    getCourseResourcesFull(courseId),
    loadCourseSubjects(id, courseId),
  ]);
  const position = courses.findIndex((c) => c.id === courseId);
  if (!mod || position === -1) notFound();
  const course = courses[position];
  const next = courses[position + 1];
  const resources = studentFacing(allResources);

  const { sections, slides } = buildCourseDeck({
    moduleName: mod.name,
    course,
    position,
    next,
    resources,
    resumeLines: previousNextTime(courses, position),
    subjects,
    hidden,
  });

  return (
    <PresentShell
      title={`${mod.name} — Séance ${position + 1} : ${course.title}`}
      backHref={`/modules/${mod.id}`}
      backLabel="la fiche du module"
      sections={sections}
      slides={slides}
      syncChannel={syncChannelName(courseId)}
      presenterHref={`/present/modules/${mod.id}/courses/${courseId}/presenter`}
      footerNote={`${mod.name} · Séance ${position + 1}`}
    />
  );
}
