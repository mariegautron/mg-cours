import {
  coverSlide,
  formatLongDate,
  listSlide,
  resourceSlides,
  subjectSlides,
  type SubjectDeckInput,
} from "@/components/present/deck";
import type { PresentSlide } from "@/components/present/present-shell";
import type { Tables } from "@/types/db";

/**
 * Déroulé projeté d'une séance : titre → objectifs → ressources étudiant·es → sujets → clôture.
 * `resources` DOIT déjà être filtré par `studentFacing()` : ce déroulé est projeté.
 * Partagé par la fenêtre projetée et la vue présentatrice, qui montrent les mêmes diapositives.
 */
export function buildCourseDeck({
  moduleName,
  course,
  position,
  next,
  resources,
  resumeLines = [],
  subjects = [],
}: {
  moduleName: string;
  course: { title: string; session_date: string | null; learning_objectives: string[] };
  /** Rang de la séance dans le module, à partir de 0. */
  position: number;
  next: { title: string; session_date: string | null } | undefined;
  resources: Tables<"resource">[];
  /** Consigne de la séance précédente (US-68), déjà réduite à des lignes de texte. */
  resumeLines?: string[];
  /** Sujets des évaluations rattachées à la séance (déjà réduits au contenu étudiant·es, US-90). */
  subjects?: SubjectDeckInput[];
}): { sections: string[]; slides: PresentSlide[] } {
  const sections = ["Ouverture"];
  const slides: PresentSlide[] = [
    coverSlide(0, {
      eyebrow: `${moduleName} · Séance ${position + 1}`,
      title: course.title,
      subtitle: course.session_date ? formatLongDate(course.session_date) : null,
    }),
  ];
  if (resumeLines.length) {
    slides.push(listSlide(0, "Pour aujourd’hui, vous deviez…", resumeLines));
  }
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

  for (const subject of subjects) {
    sections.push(`Sujet — ${subject.title}`);
    slides.push(...subjectSlides(sections.length - 1, subject));
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
