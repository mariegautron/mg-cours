import { ExternalLink, FileText } from "lucide-react";

import { Markdown } from "@/components/markdown";
import type { PresentSlide } from "@/components/present/present-shell";
import type { SubjectSection } from "@/lib/assessments/subject";
import { parseMarkdown } from "@/lib/pdf/markdown";
import { buildSlides, slideTitle } from "@/lib/present/slides";
import {
  isImageMime,
  parseResourceFiles,
  resolveImageSrc,
  resourceFileUrl,
} from "@/lib/resources/files";
import { KIND_LABELS } from "@/lib/resources/kind";
import type { Tables } from "@/types/db";

/**
 * Fabriques de diapositives (rendu serveur) pour `PresentShell`. Chaque diapo porte l'index de sa
 * section (sommaire). N'y passer QUE des ressources filtrées par `studentFacing()`.
 */

export const formatLongDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export function coverSlide(
  section: number,
  { eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string | null },
): PresentSlide {
  return {
    section,
    label: title,
    node: (
      <div className="space-y-6 py-8">
        {eyebrow ? (
          <p className="text-primary text-2xl font-medium tracking-wide uppercase">{eyebrow}</p>
        ) : null}
        <h2 className="font-heading text-6xl leading-tight font-semibold text-balance">{title}</h2>
        {subtitle ? <p className="text-muted-foreground text-3xl">{subtitle}</p> : null}
      </div>
    ),
  };
}

export function listSlide(section: number, heading: string, items: string[]): PresentSlide {
  return {
    section,
    label: heading,
    node: (
      <div className="space-y-8">
        <h2 className="font-heading text-5xl font-semibold">{heading}</h2>
        <ul className="list-disc space-y-4 pl-10 text-3xl leading-snug">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>
    ),
  };
}

export function markdownSlides(
  section: number,
  source: string,
  resolveSrc?: (src: string) => string,
): PresentSlide[] {
  return buildSlides(parseMarkdown(source)).map(({ blocks, reminder, part }) => ({
    section,
    label: slideTitle(blocks) ?? (reminder ? `${reminder} (suite)` : null),
    node: (
      <div className="space-y-4">
        {reminder || (part && part.index > 1) ? (
          <p className="text-muted-foreground text-2xl">
            {reminder}
            {part && part.index > 1 ? (
              <span>
                {reminder ? " · " : ""}suite {part.index}/{part.total}
              </span>
            ) : null}
          </p>
        ) : null}
        <Markdown
          source=""
          blocks={blocks}
          headingLevel={2}
          size="present"
          resolveImageSrc={resolveSrc}
        />
      </div>
    ),
  }));
}

/** Intercalaire + contenu + lien + fichiers joints d'une ressource. */
export function resourceSlides(section: number, resource: Tables<"resource">): PresentSlide[] {
  const slides: PresentSlide[] = [
    coverSlide(section, {
      eyebrow: resource.kind ? KIND_LABELS[resource.kind] : "Ressource",
      title: resource.title,
      subtitle: resource.description,
    }),
  ];

  if (resource.content) {
    slides.push(
      ...markdownSlides(section, resource.content, (src) => resolveImageSrc(resource.id, src)),
    );
  }

  if (resource.url) {
    slides.push({
      section,
      label: "Lien",
      node: (
        <div className="space-y-8">
          <h2 className="font-heading text-5xl font-semibold">Lien</h2>
          <a
            href={resource.url}
            target="_blank"
            rel="noreferrer"
            className="text-primary inline-flex items-center gap-3 text-4xl break-all underline underline-offset-4"
          >
            {resource.url}
            <ExternalLink aria-hidden className="size-8 shrink-0" />
            <span className="sr-only">(nouvel onglet)</span>
          </a>
        </div>
      ),
    });
  }

  const files = parseResourceFiles(resource.files);
  const others = [];
  for (const file of files) {
    const url = resourceFileUrl(resource.id, file.name);
    if (isImageMime(file.mime)) {
      slides.push({
        section,
        label: file.name,
        node: (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={file.name} className="mx-auto max-h-[75vh] max-w-full rounded-md" />
        ),
      });
    } else if (file.mime === "application/pdf") {
      slides.push({
        section,
        label: file.name,
        node: (
          <div className="space-y-3">
            <iframe src={url} title={file.name} className="h-[75vh] w-full rounded-md border" />
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-lg underline underline-offset-2"
            >
              Ouvrir « {file.name} » dans un nouvel onglet
            </a>
          </div>
        ),
      });
    } else {
      others.push(file);
    }
  }
  if (others.length) {
    slides.push({
      section,
      label: "Fichiers",
      node: (
        <div className="space-y-8">
          <h2 className="font-heading text-5xl font-semibold">Fichiers</h2>
          <ul className="space-y-4 text-3xl">
            {others.map((file) => (
              <li key={file.path}>
                <a
                  href={resourceFileUrl(resource.id, file.name, true)}
                  className="inline-flex items-center gap-3 underline underline-offset-4"
                >
                  <FileText aria-hidden className="size-8" />
                  {file.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ),
    });
  }

  return slides;
}

/** Sujet d'une évaluation prêt à projeter (contenu étudiant·es uniquement). */
export interface SubjectDeckInput {
  title: string;
  type: string | null;
  durationMinutes: number | null;
  sections: SubjectSection[];
  /** Critères de la grille annoncés : libellé et barème, jamais de note. */
  criteria: { label: string; points: number; bonus: boolean }[];
}

/**
 * Diapositives du sujet d'une évaluation : intercalaire, puis objectif, consigne, rendu attendu et
 * ce qui sera évalué (avec les critères de la grille). Les fichiers joints ne sont ni affichés ni
 * projetés : ils se téléchargent depuis la page de l'évaluation.
 */
export function subjectSlides(section: number, subject: SubjectDeckInput): PresentSlide[] {
  const slides: PresentSlide[] = [
    coverSlide(section, {
      eyebrow: subject.type ? `Sujet · ${subject.type}` : "Sujet",
      title: subject.title,
      subtitle: subject.durationMinutes ? `Durée : ${subject.durationMinutes} min` : null,
    }),
  ];
  for (const part of subject.sections) {
    slides.push(...markdownSlides(section, `## ${part.heading}\n\n${part.text}`));
    if (part.key === "evaluated" && subject.criteria.length) {
      slides.push(criteriaSlide(section, subject.criteria));
    }
  }
  if (!subject.sections.some((p) => p.key === "evaluated") && subject.criteria.length) {
    slides.push({
      ...criteriaSlide(section, subject.criteria),
    });
  }
  return slides;
}

function criteriaSlide(
  section: number,
  criteria: { label: string; points: number; bonus: boolean }[],
): PresentSlide {
  return listSlide(
    section,
    "Critères de la grille",
    criteria.map(
      (c) => `${c.label} — ${c.points} pt${c.points > 1 ? "s" : ""}${c.bonus ? " (bonus)" : ""}`,
    ),
  );
}
