import { getModuleCourses } from "@/lib/modules/queries";

/** Séance d'où l'on vient (création ou ouverture d'une ressource depuis son déroulé). */
export interface CourseOrigin {
  moduleId: string;
  courseId: string;
  /** « Séance 1 · Titre ». */
  label: string;
  href: string;
}

const UUID = /^[0-9a-f-]{36}$/i;

/** Lit `?module=…&course=…` et retrouve la séance (numéro, titre) ; `null` si absente ou invalide. */
export async function readCourseOrigin(sp: {
  [key: string]: string | string[] | undefined;
}): Promise<CourseOrigin | null> {
  const moduleId = typeof sp.module === "string" ? sp.module : "";
  const courseId = typeof sp.course === "string" ? sp.course : "";
  if (!UUID.test(moduleId) || !UUID.test(courseId)) return null;
  const courses = await getModuleCourses(moduleId);
  const position = courses.findIndex((c) => c.id === courseId);
  if (position === -1) return null;
  return {
    moduleId,
    courseId,
    label: `Séance ${position + 1} · ${courses[position].title}`,
    href: `/modules/${moduleId}/courses/${courseId}`,
  };
}

/** Paramètres d'URL qui transmettent la séance d'origine. */
export function originQuery(moduleId: string, courseId: string): string {
  return `module=${moduleId}&course=${courseId}`;
}
