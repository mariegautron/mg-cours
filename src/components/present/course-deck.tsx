import { coverSlide, formatLongDate, listSlide, resourceSlides } from "@/components/present/deck";
import type { PresentSlide } from "@/components/present/present-shell";
import type { Tables } from "@/types/db";

/**
 * Déroulé projeté d'une séance : titre → objectifs → ressources étudiant·es → clôture.
 * `resources` DOIT déjà être filtré par `studentFacing()` : ce déroulé est projeté.
 * Partagé par la fenêtre projetée et la vue présentatrice, qui montrent les mêmes diapositives.
 */
export function buildCourseDeck({
  moduleName,
  course,
  position,
  next,
  resources,
}: {
  moduleName: string;
  course: { title: string; session_date: string | null; learning_objectives: string[] };
  /** Rang de la séance dans le module, à partir de 0. */
  position: number;
  next: { title: string; session_date: string | null } | undefined;
  resources: Tables<"resource">[];
}): { sections: string[]; slides: PresentSlide[] } {
  const sections = ["Ouverture"];
  const slides: PresentSlide[] = [
    coverSlide(0, {
      eyebrow: `${moduleName} · Séance ${position + 1}`,
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

  return { sections, slides };
}
