import type { CourseWithResources } from "@/lib/modules/queries";

/**
 * Séances « vides » : sans date ni horaire, encore « à préparer », sans ressource, sans texte, sans
 * diapos, sans plan, sans évaluation ni attendu rattaché. Ce sont celles qu'on peut retirer d'un
 * coup (par exemple des séances créées à tort) ; la moindre trace de travail les met à l'abri.
 * Fonction pure.
 */
export interface EmptySessionContext {
  /** Plans (livrable, ordre des ressources) par séance. */
  plans: ReadonlyMap<string, { deliverable: string; resourceOrder: string[] }>;
  /** Séances auxquelles une évaluation est rattachée. */
  assessmentCourseIds: ReadonlySet<string>;
  /** Séances qui traitent au moins un attendu. */
  expectationCourseIds: ReadonlySet<string>;
}

const filled = (value: string | null | undefined) => (value ?? "").trim() !== "";

export function isEmptyUndatedSession(
  course: CourseWithResources,
  ctx: EmptySessionContext,
): boolean {
  const plan = ctx.plans.get(course.id);
  const slides = Array.isArray(course.slides) ? course.slides.length : 0;
  return (
    course.session_date === null &&
    course.start_time === null &&
    course.end_time === null &&
    course.prep_status === "todo" &&
    course.completion === null &&
    course.resources.length === 0 &&
    !filled(course.animation_notes) &&
    !filled(course.assessment_notes) &&
    !filled(course.material) &&
    !filled(course.not_covered) &&
    !filled(course.next_time) &&
    !filled(course.retro_note) &&
    !filled(course.slides_url) &&
    slides === 0 &&
    !filled(plan?.deliverable) &&
    (plan?.resourceOrder.length ?? 0) === 0 &&
    !ctx.assessmentCourseIds.has(course.id) &&
    !ctx.expectationCourseIds.has(course.id)
  );
}

export function emptyUndatedSessions(
  courses: CourseWithResources[],
  ctx: EmptySessionContext,
): CourseWithResources[] {
  return courses.filter((c) => isEmptyUndatedSession(c, ctx));
}
