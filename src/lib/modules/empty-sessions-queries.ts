import "server-only";

import { listModuleAssessments } from "@/lib/assessments/queries";
import { getModulePlans } from "@/lib/modules/course-plan-queries";
import { emptyUndatedSessions } from "@/lib/modules/empty-sessions";
import { getExpectationCourses } from "@/lib/modules/matching-queries";
import { getModuleCourses, type CourseWithResources } from "@/lib/modules/queries";

/** Séances du module sans date, sans contenu et sans lien : celles qu'on peut supprimer d'un coup. */
export async function listEmptySessions(moduleId: string): Promise<CourseWithResources[]> {
  const courses = await getModuleCourses(moduleId);
  if (courses.length === 0) return [];
  const [{ plans }, assessments, byExpectation] = await Promise.all([
    getModulePlans(courses.map((c) => c.id)),
    listModuleAssessments(moduleId),
    getExpectationCourses(moduleId),
  ]);
  return emptyUndatedSessions(courses, {
    plans,
    assessmentCourseIds: new Set(assessments.flatMap((a) => (a.course_id ? [a.course_id] : []))),
    expectationCourseIds: new Set([...byExpectation.values()].flat()),
  });
}
