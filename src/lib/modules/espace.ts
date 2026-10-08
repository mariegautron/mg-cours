/**
 * Espace étudiant·e (page publique `/module/[jeton]`) : l'instantané publié par l'enseignante contient,
 * en plus de la frise, le brief du projet, les évaluations (sujet, grille) et les fiches de cours
 * prêtes pour les étudiant·es. Fonctions pures : forme de l'instantané, relecture défensive, choix du
 * « prochain rendu ». Rien de privé n'y entre : notes d'animation, corrigés, banque de questions,
 * guides enseignante n'ont aucun champ ici.
 */
import { publicSlidesUrl, type Frise } from "@/lib/modules/frise";

export interface EspaceOptions {
  brief: boolean;
  evaluations: boolean;
  courses: boolean;
}

export const DEFAULT_ESPACE_OPTIONS: EspaceOptions = {
  brief: true,
  evaluations: true,
  courses: true,
};

export interface EspaceGridCriterion {
  label: string;
  weight: number;
  bonus: boolean;
  levels: { points: number; description: string }[];
}

export interface EspaceGrid {
  maxScore: number;
  axes: { label: string | null; points: number; criteria: EspaceGridCriterion[] }[];
}

export interface EspaceEvaluation {
  title: string;
  type: string | null;
  groupGrade: boolean;
  sessionNumber: number | null;
  /** AAAA-MM-JJ ou null. */
  date: string | null;
  /** `HH:MM` ou null. */
  time: string | null;
  durationMinutes: number | null;
  whereToSubmit: string | null;
  /** Objectif, consigne, rendu attendu, ce qui est évalué : Markdown, dans l'ordre de lecture. */
  sections: { heading: string; text: string }[];
  grid: EspaceGrid | null;
}

export interface EspaceImage {
  name: string;
  /** Chemin dans le bucket privé ; sert uniquement à la route de fichier, jamais affiché. */
  path: string;
  mime: string;
}

export interface EspaceResource {
  title: string;
  kindLabel: string | null;
  content: string | null;
  url: string | null;
  images: EspaceImage[];
}

export interface EspaceCourse {
  number: number;
  title: string;
  date: string | null;
  resources: EspaceResource[];
}

export interface Espace {
  options: EspaceOptions;
  brief: { title: string; text: string } | null;
  evaluations: EspaceEvaluation[];
  courses: EspaceCourse[];
}

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" ? (v as Record<string, unknown>) : {};

function parseGrid(raw: unknown): EspaceGrid | null {
  const g = obj(raw);
  const axes = arr(g.axes).map((a) => {
    const o = obj(a);
    return {
      label: str(o.label),
      points: num(o.points) ?? 0,
      criteria: arr(o.criteria).map((c) => {
        const k = obj(c);
        return {
          label: str(k.label) ?? "",
          weight: num(k.weight) ?? 0,
          bonus: k.bonus === true,
          levels: arr(k.levels).map((l) => ({
            points: num(obj(l).points) ?? 0,
            description: str(obj(l).description) ?? "",
          })),
        };
      }),
    };
  });
  return axes.length ? { maxScore: num(g.maxScore) ?? 0, axes } : null;
}

/** Relit la partie « espace » d'un instantané ; `null` pour une publication de la frise seule. */
export function parseEspace(payload: unknown): Espace | null {
  const raw = obj(obj(payload).espace);
  if (!Object.keys(raw).length) return null;
  const options = obj(raw.options);
  const brief = obj(raw.brief);
  return {
    options: {
      brief: options.brief !== false,
      evaluations: options.evaluations !== false,
      courses: options.courses !== false,
    },
    brief: str(brief.text)
      ? { title: str(brief.title) ?? "Le projet", text: brief.text as string }
      : null,
    evaluations: arr(raw.evaluations).flatMap((e) => {
      const o = obj(e);
      const title = str(o.title);
      if (!title) return [];
      return [
        {
          title,
          type: str(o.type),
          groupGrade: o.groupGrade === true,
          sessionNumber: num(o.sessionNumber),
          date: str(o.date),
          time: str(o.time),
          durationMinutes: num(o.durationMinutes),
          whereToSubmit: str(o.whereToSubmit),
          sections: arr(o.sections).flatMap((s) => {
            const heading = str(obj(s).heading);
            const text = str(obj(s).text);
            return heading && text ? [{ heading, text }] : [];
          }),
          grid: parseGrid(o.grid),
        },
      ];
    }),
    courses: arr(raw.courses).flatMap((c) => {
      const o = obj(c);
      const number = num(o.number);
      if (number === null) return [];
      return [
        {
          number,
          title: str(o.title) ?? `Séance ${number}`,
          date: str(o.date),
          resources: arr(o.resources).flatMap((r) => {
            const k = obj(r);
            const title = str(k.title);
            if (!title) return [];
            return [
              {
                title,
                kindLabel: str(k.kindLabel),
                content: str(k.content),
                url: publicSlidesUrl(k.url),
                images: arr(k.images).flatMap((i) => {
                  const f = obj(i);
                  const name = str(f.name);
                  const path = str(f.path);
                  const mime = str(f.mime);
                  return name && path && mime && /^image\/(png|jpeg|gif|webp)$/.test(mime)
                    ? [{ name, path, mime }]
                    : [];
                }),
              },
            ];
          }),
        },
      ];
    }),
  };
}

/** Rang (à partir de 0) du prochain rendu parmi les évaluations publiées, ou `null`. */
export function nextEvaluationIndex(
  espace: Espace | null,
  frise: Frise,
  today: string,
): number | null {
  if (!espace || espace.evaluations.length === 0) return null;
  const dateOf = new Map(frise.sessions.map((s) => [s.number, s.date]));
  const dueOf = (e: EspaceEvaluation) =>
    e.date ?? (e.sessionNumber !== null ? (dateOf.get(e.sessionNumber) ?? null) : null);
  const upcoming = espace.evaluations
    .map((e, index) => ({ e, index, due: dueOf(e) }))
    .filter((x) => !x.due || x.due >= today)
    .sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999") || a.index - b.index);
  return upcoming[0]?.index ?? null;
}

/** « 3 novembre 2026 à 8 h 00 » / « 3 novembre 2026 » / « date à fixer ». */
export function dueLabel(date: string | null, time: string | null): string {
  if (!date) return "date à fixer";
  const day = new Date(`${date}T12:00:00Z`).toLocaleDateString("fr-FR", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const m = time?.match(/^(\d{1,2}):(\d{2})/);
  return m ? `${day} à ${Number(m[1])} h ${m[2]}` : day;
}

/** L'instantané est plus ancien que la dernière modification des données du module. */
export function isStale(publishedAt: string | null, latestChange: string | null): boolean {
  if (!publishedAt || !latestChange) return false;
  return new Date(latestChange).getTime() > new Date(publishedAt).getTime() + 1000;
}

/** Ce qui sera visible, en mots, pour l'aperçu côté enseignante. */
export function previewLines(espace: Espace): string[] {
  const lines: string[] = [];
  if (espace.options.brief) {
    lines.push(
      espace.brief
        ? `Le brief du projet : « ${espace.brief.title} »`
        : "Le brief du projet (rien à publier pour l’instant)",
    );
  }
  if (espace.options.evaluations) {
    const withGrid = espace.evaluations.filter((e) => e.grid).length;
    lines.push(
      espace.evaluations.length
        ? `${espace.evaluations.length} évaluation${espace.evaluations.length > 1 ? "s" : ""} (sujet${withGrid ? `, ${withGrid} grille${withGrid > 1 ? "s" : ""}` : ""})`
        : "Évaluations : aucune n’est prête",
    );
  }
  if (espace.options.courses) {
    const n = espace.courses.reduce((t, c) => t + c.resources.length, 0);
    lines.push(
      n
        ? `${n} fiche${n > 1 ? "s" : ""} de cours publiée${n > 1 ? "s" : ""}`
        : "Cours : aucune fiche prête",
    );
  }
  return lines;
}
