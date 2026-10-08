import {
  cadreSlides,
  coverSlide,
  formatLongDate,
  gridSlidesOf,
  listSlide,
  resourceSlides,
  subjectSlides,
  type SubjectDeckInput,
} from "@/components/present/deck";
import { qcmSlides } from "@/components/present/qcm-deck";
import type { PresentSlide } from "@/components/present/present-shell";
import {
  cadreKey,
  CLOSING_KEY,
  gridKey,
  OBJECTIVES_KEY,
  OPENING_KEY,
  resourceKey,
  RESUME_KEY,
  subjectKey,
} from "@/lib/present/plan";
import type { QcmGroup } from "@/lib/present/qcm";
import type { Tables } from "@/types/db";

/**
 * Déroulé projeté d'une séance : titre → objectifs → ressources étudiant·es → mini-QCM → sujets → clôture.
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
  qcm = [],
  hidden = new Set<string>(),
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
  /** Mini-QCM des fiches projetées (voir `loadCourseQcm`), projetés après les ressources. */
  qcm?: QcmGroup[];
  /** Éléments « pour moi » : jamais projetés (voir `parseHidden`). */
  hidden?: ReadonlySet<string>;
}): { sections: string[]; sectionKeys: string[]; slides: PresentSlide[] } {
  const sections = ["Ouverture"];
  // Clé stable de chaque section (même ordre que `sections`) : journal de projection, clôture.
  const sectionKeys = [OPENING_KEY];
  const slides: PresentSlide[] = [
    coverSlide(0, {
      eyebrow: `${moduleName} · Séance ${position + 1}`,
      title: course.title,
      subtitle: course.session_date ? formatLongDate(course.session_date) : null,
    }),
  ];
  if (resumeLines.length && !hidden.has(RESUME_KEY)) {
    slides.push(listSlide(0, "Pour aujourd’hui, vous deviez…", resumeLines));
  }
  if (course.learning_objectives.length && !hidden.has(OBJECTIVES_KEY)) {
    slides.push(listSlide(0, "Objectifs de la séance", course.learning_objectives));
  }
  resources = resources.filter((r) => !hidden.has(resourceKey(r.id)));
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
    sectionKeys.push(resourceKey(resource.id));
    slides.push(...resourceSlides(sections.length - 1, resource));
  }

  for (const group of qcm) {
    sections.push(`Mini-QCM — ${group.title}`);
    sectionKeys.push(group.key);
    slides.push(...qcmSlides(sections.length - 1, group));
  }

  for (const subject of subjects) {
    if (!hidden.has(subjectKey(subject.title))) {
      sections.push(`Sujet — ${subject.title}`);
      sectionKeys.push(subjectKey(subject.title));
      slides.push(...subjectSlides(sections.length - 1, subject));
    }
    if (subject.cadre && !hidden.has(cadreKey(subject.title))) {
      sections.push(`Cadre — ${subject.title}`);
      sectionKeys.push(cadreKey(subject.title));
      slides.push(...cadreSlides(sections.length - 1, subject));
    }
    if (subject.grid && !hidden.has(gridKey(subject.title))) {
      sections.push(`Grille — ${subject.title}`);
      sectionKeys.push(gridKey(subject.title));
      slides.push(...gridSlidesOf(sections.length - 1, subject));
    }
  }

  sections.push("Clôture");
  sectionKeys.push(CLOSING_KEY);
  slides.push(
    coverSlide(sections.length - 1, {
      eyebrow: "Merci !",
      title: next ? `Prochaine séance : ${next.title}` : "Fin du module",
      subtitle: next?.session_date ? formatLongDate(next.session_date) : null,
    }),
  );

  return { sections, sectionKeys, slides };
}
