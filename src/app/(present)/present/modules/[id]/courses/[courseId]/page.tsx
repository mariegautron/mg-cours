import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { coverSlide, formatLongDate, listSlide, resourceSlides } from "@/components/present/deck";
import { PresentShell, type PresentSlide } from "@/components/present/present-shell";
import { getCourseResourcesFull, getModule, getModuleCourses } from "@/lib/modules/queries";
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
}: PageProps<"/present/modules/[id]/courses/[courseId]">) {
  const { id, courseId } = await params;
  const [mod, courses, allResources] = await Promise.all([
    getModule(id),
    getModuleCourses(id),
    getCourseResourcesFull(courseId),
  ]);
  const position = courses.findIndex((c) => c.id === courseId);
  if (!mod || position === -1) notFound();
  const course = courses[position];
  const next = courses[position + 1];
  const resources = studentFacing(allResources);

  const sections = ["Ouverture"];
  const slides: PresentSlide[] = [
    coverSlide(0, {
      eyebrow: `${mod.name} · Séance ${position + 1}`,
      title: course.title,
      subtitle: course.session_date ? formatLongDate(course.session_date) : null,
    }),
  ];
  if (course.learning_objectives.length) {
    slides.push(listSlide(0, "Objectifs de la séance", course.learning_objectives));
  }
  if (resources.length > 1) {
    slides.push(
      listSlide(
        0,
        "Au programme",
        resources.map((r) => r.title),
      ),
    );
  }

  for (const resource of resources) {
    sections.push(resource.title);
    slides.push(...resourceSlides(sections.length - 1, resource));
  }

  sections.push("Clôture");
  slides.push(
    coverSlide(sections.length - 1, {
      eyebrow: "Merci !",
      title: next ? `Prochaine séance : ${next.title}` : "Fin du module",
      subtitle: next?.session_date ? formatLongDate(next.session_date) : null,
    }),
  );

  return (
    <PresentShell
      title={`${mod.name} — Séance ${position + 1} : ${course.title}`}
      backHref={`/modules/${mod.id}`}
      backLabel="la fiche du module"
      sections={sections}
      slides={slides}
    />
  );
}
